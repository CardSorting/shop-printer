import { NextResponse } from 'next/server';
import type { CampaignChannel, CampaignStatus, CampaignType, MarketingCampaignDraft } from '@domain/models';
import { DomainError } from '@domain/errors';
import { getServerServices } from '@infrastructure/server/services';
import {
  jsonError,
  optionalBoolean,
  optionalInteger,
  optionalString,
  parseBoundedLimit,
  readJsonObject,
  requireAdminSession,
  requireString,
} from '@infrastructure/server/apiGuards';

const CAMPAIGN_TYPES = new Set<CampaignType>([
  'welcome_series',
  'abandoned_cart',
  'browse_abandonment',
  'site_abandonment',
  'post_purchase',
  'replenishment',
  'review_request',
  'comeback_offer',
  'product_upsell',
  'loyalty_reward',
  'cross_sell',
  'win_back',
  'sunset',
]);
const CAMPAIGN_STATUSES = new Set<CampaignStatus>(['draft', 'active', 'paused', 'archived', 'completed']);
const CAMPAIGN_CHANNELS = new Set<CampaignChannel>(['email', 'sms', 'concierge_push', 'store_notice']);
const TRIGGER_TYPES = new Set<MarketingCampaignDraft['triggerType']>(['event', 'segment', 'schedule']);
const GOAL_TYPES = new Set<MarketingCampaignDraft['goalType']>(['purchase', 'visit', 'click']);

function parseCampaignType(value: unknown): CampaignType | undefined {
  const type = optionalString(value, 'type');
  if (!type) return undefined;
  if (!CAMPAIGN_TYPES.has(type as CampaignType)) throw new DomainError('Campaign type is invalid.');
  return type as CampaignType;
}

function parseCampaignStatus(value: unknown): CampaignStatus | undefined {
  const status = optionalString(value, 'status');
  if (!status) return undefined;
  if (!CAMPAIGN_STATUSES.has(status as CampaignStatus)) throw new DomainError('Campaign status is invalid.');
  return status as CampaignStatus;
}

function parseChannels(value: unknown): CampaignChannel[] {
  const rawChannels = value === undefined ? ['email'] : value;
  if (!Array.isArray(rawChannels) || rawChannels.length === 0) throw new DomainError('channels must be a non-empty list.');
  const channels = rawChannels.map((item, index) => {
    const channel = requireString(item, `channels[${index}]`);
    if (!CAMPAIGN_CHANNELS.has(channel as CampaignChannel)) throw new DomainError(`channels[${index}] is invalid.`);
    return channel as CampaignChannel;
  });
  return [...new Set(channels)];
}

function parseTriggerType(value: unknown): MarketingCampaignDraft['triggerType'] {
  const triggerType = optionalString(value, 'triggerType') ?? 'event';
  if (!TRIGGER_TYPES.has(triggerType as MarketingCampaignDraft['triggerType'])) {
    throw new DomainError('triggerType is invalid.');
  }
  return triggerType as MarketingCampaignDraft['triggerType'];
}

function parseGoalType(value: unknown): MarketingCampaignDraft['goalType'] {
  const goalType = optionalString(value, 'goalType') ?? 'purchase';
  if (!GOAL_TYPES.has(goalType as MarketingCampaignDraft['goalType'])) {
    throw new DomainError('goalType is invalid.');
  }
  return goalType as MarketingCampaignDraft['goalType'];
}

function optionalObject(value: unknown, field: string): Record<string, any> | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'object' || Array.isArray(value)) throw new DomainError(`${field} must be an object.`);
  return value as Record<string, any>;
}

function optionalArray(value: unknown, field: string): any[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (!Array.isArray(value)) throw new DomainError(`${field} must be a list.`);
  return value;
}

function parseMarketingCampaignDraft(body: Record<string, unknown>): MarketingCampaignDraft {
  const type = parseCampaignType(body.type);
  if (!type) throw new DomainError('type is required.');
  const priority = optionalInteger(body.priority, 'priority') ?? 5;
  if (priority < 1 || priority > 10) throw new DomainError('priority must be between 1 and 10.');
  const conversionWindowDays = optionalInteger(body.conversionWindowDays, 'conversionWindowDays') ?? 30;
  if (conversionWindowDays < 1 || conversionWindowDays > 365) {
    throw new DomainError('conversionWindowDays must be between 1 and 365.');
  }

  return {
    name: requireString(body.name, 'name'),
    description: optionalString(body.description, 'description') ?? '',
    type,
    status: parseCampaignStatus(body.status) ?? 'draft',
    channels: parseChannels(body.channels),
    triggerType: parseTriggerType(body.triggerType),
    triggerConfig: optionalObject(body.triggerConfig, 'triggerConfig') ?? {},
    aiPersonalizationEnabled: optionalBoolean(body.aiPersonalizationEnabled, 'aiPersonalizationEnabled') ?? false,
    baseTemplateId: optionalString(body.baseTemplateId, 'baseTemplateId'),
    subjectTemplate: optionalString(body.subjectTemplate, 'subjectTemplate'),
    bodyTemplate: optionalString(body.bodyTemplate, 'bodyTemplate'),
    discountCode: optionalString(body.discountCode, 'discountCode'),
    goalType: parseGoalType(body.goalType),
    conversionWindowDays,
    lifecycleStage: optionalString(body.lifecycleStage, 'lifecycleStage') as MarketingCampaignDraft['lifecycleStage'],
    offerStrategy: optionalString(body.offerStrategy, 'offerStrategy') as MarketingCampaignDraft['offerStrategy'],
    suppressionRules: optionalObject(body.suppressionRules, 'suppressionRules') as MarketingCampaignDraft['suppressionRules'],
    learningObjective: optionalString(body.learningObjective, 'learningObjective'),
    isSequence: optionalBoolean(body.isSequence, 'isSequence') ?? false,
    steps: (optionalArray(body.steps, 'steps') ?? []) as MarketingCampaignDraft['steps'],
    frequencyCapDays: optionalInteger(body.frequencyCapDays, 'frequencyCapDays'),
    priority,
    dynamicIncentivesEnabled: optionalBoolean(body.dynamicIncentivesEnabled, 'dynamicIncentivesEnabled') ?? false,
    incentiveRules: optionalArray(body.incentiveRules, 'incentiveRules') as MarketingCampaignDraft['incentiveRules'],
  };
}

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const { campaignService } = await getServerServices();

    const { searchParams } = new URL(request.url);
    const status = parseCampaignStatus(searchParams.get('status'));
    const type = parseCampaignType(searchParams.get('type'));
    const limit = parseBoundedLimit(searchParams.get('limit'), 50, 100);

    const campaigns = await campaignService.listCampaigns({ status, type, limit });
    
    return NextResponse.json(campaigns);
  } catch (error) {
    return jsonError(error, 'Failed to fetch campaigns', request);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdminSession(request);
    const body = await readJsonObject(request);
    const { campaignService } = await getServerServices();
    const campaign = await campaignService.createCampaign(parseMarketingCampaignDraft(body), { id: user.id, email: user.email });

    return NextResponse.json(campaign);
  } catch (error) {
    return jsonError(error, 'Failed to create campaign', request);
  }
}
