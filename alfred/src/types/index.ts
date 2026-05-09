export type Network = 'instagram' | 'tiktok' | 'linkedin'
export type Plan = 'internal' | 'starter' | 'pro'
export type AgentMode = 'advisory' | 'execution'
export type TaskType = 'PUBLICAR' | 'RESPONDER' | 'ANALIZAR' | 'OPTIMIZAR' | 'CRECER'
export type TaskStatus = 'pending' | 'done' | 'skipped'
export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed'
export type MediaType = 'image' | 'video' | 'carousel' | 'text'
export type MetricName = 'followers' | 'likes' | 'comments' | 'shares' | 'reach' | 'impressions' | 'engagement_rate'
export type GoalMetric = 'followers' | 'engagement_rate' | 'reach' | 'posts_per_week'

export interface Workspace {
  id: string
  name: string
  owner_id: string
  plan: Plan
  created_at: string
}

export interface SocialAccount {
  id: string
  workspace_id: string
  network: Network
  account_id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  is_active: boolean
  connected_at: string
}

export interface WorkspaceGoal {
  id: string
  workspace_id: string
  network: Network | null
  metric: GoalMetric
  current_value: number | null
  target_value: number
  deadline: string | null
  is_active: boolean
  created_at: string
}

export interface DailyTask {
  id: string
  workspace_id: string
  date: string
  type: TaskType
  title: string
  description: string | null
  network: Network | null
  priority: number | null
  status: TaskStatus
  agent_generated: boolean
  goal_id: string | null
  created_at: string
}

export interface ContentPost {
  id: string
  workspace_id: string
  caption: string | null
  media_urls: string[] | null
  media_type: MediaType | null
  scheduled_at: string | null
  networks: Network[]
  status: PostStatus
  published_at: string | null
  external_ids: Record<string, string> | null
  metrics_snapshot: Record<string, unknown> | null
  created_at: string
}

export interface AnalyticsSnapshot {
  id: string
  workspace_id: string
  network: Network
  metric_name: MetricName
  value: number
  period_start: string | null
  period_end: string | null
  recorded_at: string
}

export interface AgentConversation {
  id: string
  workspace_id: string
  role: 'user' | 'assistant'
  content: string
  tool_calls: unknown | null
  agent_mode: AgentMode | null
  created_at: string
}

export interface AgentContext {
  connected_networks: Network[]
  goals_summary: WorkspaceGoal[]
  analytics_summary: AnalyticsSnapshot[]
  pending_tasks: DailyTask[]
  recent_posts: ContentPost[]
}
