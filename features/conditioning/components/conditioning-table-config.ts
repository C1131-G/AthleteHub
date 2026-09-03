import {
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_text,
  tableFeatures,
} from "@tanstack/react-table";

/**
 * Sorting and pagination are the only table features the conditioning lists
 * need; registering them explicitly keeps unused v9 features out of the bundle.
 */
export const conditioningTableFeatures = tableFeatures({
  paginatedRowModel: createPaginatedRowModel(),
  rowPaginationFeature,
  rowSortingFeature,
  sortFns: {
    text: sortFn_text,
  },
  sortedRowModel: createSortedRowModel(),
});

export const conditioningPageSize = 10;

export const conditioningTableInitialState = {
  pagination: { pageIndex: 0, pageSize: conditioningPageSize },
};
