export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginationResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export function getPaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12')))
  
  return { page, limit }
}

export function getPaginationOffset(page: number, limit: number): number {
  return (page - 1) * limit
}

export function calculatePagination(
  page: number,
  limit: number,
  total: number
): PaginationResult<any>['pagination'] {
  const totalPages = Math.ceil(total / limit)
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  }
}

export function createPaginationResult<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginationResult<T> {
  return {
    data,
    pagination: calculatePagination(page, limit, total),
  }
}

export function getPaginationLinks(
  baseUrl: string,
  page: number,
  totalPages: number,
  searchParams: URLSearchParams
) {
  const createUrl = (pageNum: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', pageNum.toString())
    return `${baseUrl}?${params.toString()}`
  }

  return {
    first: page > 1 ? createUrl(1) : null,
    prev: page > 1 ? createUrl(page - 1) : null,
    next: page < totalPages ? createUrl(page + 1) : null,
    last: page < totalPages ? createUrl(totalPages) : null,
  }
}
