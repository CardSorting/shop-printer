import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { jsonError, readJsonObject, requireAdminSession, requireString } from '@infrastructure/server/apiGuards';
import { logger } from '@utils/logger';

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const services = await getServerServices();
    const strategy = await services.campaignService.getConciergeMarketingStrategy();
    return NextResponse.json(strategy);
  } catch (error: any) {
    return jsonError(error, 'Failed to build concierge marketing strategy');
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdminSession(request);
    const services = await getServerServices();
    const { campaignService, auditService } = services;

    const body = await readJsonObject(request);
    if (body?.action === 'create_missing_lifecycle_playbooks') {
      const campaigns = await campaignService.createMissingLifecyclePlaybooks();
      await auditService.record({
        userId: user.id,
        userEmail: user.email,
        action: 'campaign_created',
        targetId: 'lifecycle_strategy',
        details: {
          source: 'concierge_marketing_strategy',
          createdCount: campaigns.length,
          campaignIds: campaigns.map((campaign: any) => campaign.id),
        },
      });

      return NextResponse.json({ created: campaigns });
    }

    if (body?.action === 'run_lifecycle_automation_pulse') {
      await campaignService.runAutomationPulse();
      return NextResponse.json({ status: 'pulse_completed' });
    }

    if (body?.action === 'optimize_lifecycle_strategy') {
      const report = await campaignService.optimizeLifecycleStrategy();
      return NextResponse.json(report);
    }

    if (body?.action === 'activate_all_lifecycle_playbooks') {
      const campaigns = await campaignService.activateAllLifecyclePlaybooks();
      return NextResponse.json({ activated: campaigns });
    }

    if (body?.action === 'pause_all_lifecycle_playbooks') {
      const campaigns = await campaignService.pauseAllLifecyclePlaybooks();
      return NextResponse.json({ paused: campaigns });
    }

    if (body?.action === 'activate_playbook') {
      const playbookId = requireString(body.playbookId, 'playbookId');
      const campaign = await campaignService.activatePlaybook(playbookId);
      await auditService.record({
        userId: user.id,
        userEmail: user.email,
        action: 'campaign_created',
        targetId: campaign.id,
        details: { playbookId, source: 'concierge_marketing_strategy', status: 'active' },
      });
      return NextResponse.json(campaign);
    }

    if (body?.action === 'pause_playbook') {
      const campaign = await campaignService.pausePlaybook(requireString(body.playbookId, 'playbookId'));
      return NextResponse.json(campaign);
    }

    if (body?.action === 'plan_customer_lifecycle') {
      const userId = requireString(body.userId, 'userId');
      const plan = await campaignService.planCustomerLifecycle(userId);
      return NextResponse.json(plan);
    }

    if (body?.action === 'enroll_customer_lifecycle') {
      const userId = requireString(body.userId, 'userId');
      const playbookId = body.playbookId === undefined ? undefined : requireString(body.playbookId, 'playbookId');
      const result = await campaignService.enrollCustomerInLifecycle(userId, playbookId);
      return NextResponse.json(result);
    }

    const playbookId = body?.playbookId;
    if (!playbookId || typeof playbookId !== 'string') {
      return NextResponse.json({ error: 'playbookId is required' }, { status: 400 });
    }

    const campaign = await campaignService.createCampaignFromPlaybook(playbookId);
    await auditService.record({
      userId: user.id,
      userEmail: user.email,
      action: 'campaign_created',
      targetId: campaign.id,
      details: { playbookId, source: 'concierge_marketing_strategy', name: campaign.name, type: campaign.type },
    });

    return NextResponse.json(campaign);
  } catch (error: any) {
    return jsonError(error, 'Failed to process concierge marketing action');
  }
}
