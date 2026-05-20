import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedDb, doc, updateDoc, arrayUnion, serverTimestamp, getDoc } from '@infrastructure/firebase/bridge';
import { DomainError } from '@domain/errors';
import { jsonError, readJsonObject, requireAdminSession, requireString } from '@infrastructure/server/apiGuards';
import { logger } from '@utils/logger';

const CUSTOMER_OUTCOMES = new Set(['resolved', 'escalated', 'abandoned', 'converted']);

function requirePayload(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new DomainError('payload must be an object.');
  }
  return value as Record<string, unknown>;
}

function requireDateString(value: unknown, field: string): string {
  const raw = requireString(value, field);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new DomainError(`${field} must be a valid date.`);
  return date.toISOString();
}

function requireCustomerOutcome(value: unknown): string {
  const outcome = requireString(value, 'payload.outcome');
  if (!CUSTOMER_OUTCOMES.has(outcome)) throw new DomainError('payload.outcome is invalid.');
  return outcome;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdminSession(req);
    const { id: sessionId } = await params;
    const body = await readJsonObject(req);
    const action = requireString(body.action, 'action');
    const payload = requirePayload(body.payload);
    const operator = user.displayName || user.email;

    const db = getUnifiedDb();
    const sessionRef = doc(db, 'conciergeSessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);
    if (!sessionSnap.exists()) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const updates: any = {
      updatedAt: serverTimestamp(),
    };

    let eventLabel = '';
    let eventDescription = '';

    switch (action) {
      case 'assign':
        updates.assignedOperator = requireString(payload.operatorName, 'payload.operatorName');
        eventLabel = 'Assigned';
        eventDescription = `Session assigned to ${updates.assignedOperator}`;
        break;
      
      case 'snooze':
        updates.isSnoozed = true;
        updates.followUpDate = requireDateString(payload.followUpDate, 'payload.followUpDate');
        eventLabel = 'Snoozed';
        eventDescription = `Snoozed until ${new Date(updates.followUpDate).toLocaleString()}`;
        break;

      case 'resolve':
        updates.status = 'resolved';
        updates.escalationNeeded = false;
        eventLabel = 'Resolved';
        eventDescription = 'Session marked as resolved by operator';
        break;

      case 'add_note':
        eventLabel = 'Note Added';
        eventDescription = requireString(payload.note, 'payload.note').slice(0, 1000);
        break;

      case 'track_outcome':
        updates.customerOutcome = requireCustomerOutcome(payload.outcome);
        eventLabel = 'Outcome Tracked';
        eventDescription = `Outcome set to ${updates.customerOutcome}`;
        break;

      case 'accept_suggestion':
        updates.operatorOutcome = 'suggestion_accepted';
        eventLabel = 'Suggestion Accepted';
        eventDescription = `Accepted: ${requireString(payload.action, 'payload.action')}`;
        break;

      case 'dismiss_suggestion':
        updates.operatorOutcome = 'suggestion_dismissed';
        eventLabel = 'Suggestion Dismissed';
        eventDescription = 'Operator dismissed the AI suggestion';
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const eventType = action === 'assign'
      ? 'assigned'
      : action === 'snooze'
        ? 'reminder_set'
        : action === 'resolve'
          ? 'resolved'
        : action === 'add_note'
            ? 'note_added'
            : action === 'track_outcome'
              ? 'outcome_tracked'
              : action === 'accept_suggestion' || action === 'dismiss_suggestion'
                ? 'outcome_tracked'
                : action;

    updates.events = arrayUnion({
      type: eventType,
      timestamp: new Date().toISOString(),
      label: eventLabel,
      description: eventDescription,
      operator: operator || 'System'
    });

    await updateDoc(sessionRef, updates);

    logger.info('Concierge session action performed', { sessionId, action, operator });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to perform concierge session action', { error: error instanceof Error ? error.message : String(error) });
    return jsonError(error, 'Failed to perform concierge session action', req);
  }
}
