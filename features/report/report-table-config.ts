import {
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
} from "@tanstack/react-table";

/**
 * Sorting and pagination are the only table features the report views need.
 * Registering them explicitly keeps the unused v9 features out of the bundle.
 */
export const reportTableFeatures = tableFeatures({
  paginatedRowModel: createPaginatedRowModel(),
  rowPaginationFeature,
  rowSortingFeature,
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    text: sortFn_text,
  },
  sortedRowModel: createSortedRowModel(),
});

export const reportPageSize = 10;

export const reportTableInitialState = {
  pagination: { pageIndex: 0, pageSize: reportPageSize },
};
