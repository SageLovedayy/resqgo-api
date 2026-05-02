import { Model, FilterQuery, PopulateOptions, SortOrder } from "mongoose";

interface PaginateOptions {
  page?: number | string;
  limit?: number | string;
  sort?: Record<string, SortOrder>;
  populate?: PopulateOptions | PopulateOptions[];
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

export async function paginate<T>(
  model: Model<T>,
  query: FilterQuery<T> = {},
  options: PaginateOptions = {},
): Promise<PaginatedResult<T>> {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 10;
  const skip = (page - 1) * limit;

  const sort = options.sort ?? { createdAt: -1 };
  const populate = options.populate;

  const findQuery = model.find(query).skip(skip).limit(limit).sort(sort);

  if (populate) {
    findQuery.populate(populate);
  }

  const [results, total] = await Promise.all([
    findQuery.exec(),
    model.countDocuments(query),
  ]);

  return {
    data: results,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
}
