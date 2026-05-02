export const RANKING_WEIGHTS = {
  //Will be adjusted from env variables or by admin
  relevance: Number(process.env.RANK_WEIGHT_RELEVANCE ?? 1.0),
  trust: Number(process.env.RANK_WEIGHT_TRUST ?? 1.2),
  activity: Number(process.env.RANK_WEIGHT_RELEVANCE ?? 0.8),
  engagement: Number(process.env.RANK_WEIGHT_ENGAGEMENT ?? 0.6),
  business: Number(process.env.RANK_WEIGHT_RELEVANCE ?? 0.5),
};
