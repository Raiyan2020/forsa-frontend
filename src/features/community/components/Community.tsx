"use client";

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import moment from "moment";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import InfiniteScroll from "react-infinite-scroll-component";

import ForsaCommunity from "./ForsaCommunity";
import Post from "./Post";
import AddBanner from "./AddBanner";
import InnerPost, { PostData } from "./InnerPost";
import Loader from "@/components/ui/Loader";
import { getCommunityPosts } from "@/features/community/services/communityApi";
import { CommunityFiltersData } from "./CommunityFilterModal";

type PostItem = PostData["data"];

const PAGE_LIMIT = 10;

function Community() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [openfilter, setOpenfilter] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [filters, setFilters] = useState<CommunityFiltersData>({
    name: "",
    startDate: "",
    endDate: "",
    type: "",
    tags: [],
  });

  // For infinite scroll — accumulates every fetched page, same pattern as
  // CommunityList.tsx (the "View All" page).
  const [currentPage, setCurrentPage] = useState(1);
  const [allPosts, setAllPosts] = useState<PostItem[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const handleApplyFilters = (
    newFilters: CommunityFiltersData,
    isClear = false
  ) => {
    setFilters(newFilters);
    if (!isClear) setOpenfilter(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // A search or filter change restarts pagination from page 1. Compared
  // during render (not in an effect) so the reset lands in the same commit
  // as the change instead of triggering a cascading re-render.
  const [previousQueryKey, setPreviousQueryKey] = useState({
    debouncedSearch,
    filters,
  });
  if (
    previousQueryKey.debouncedSearch !== debouncedSearch ||
    previousQueryKey.filters !== filters
  ) {
    setPreviousQueryKey({ debouncedSearch, filters });
    setCurrentPage(1);
    setAllPosts([]);
    setHasMore(true);
  }

  const {
    data: posts,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["communityPosts", currentPage, debouncedSearch, filters],
    queryFn: () =>
      getCommunityPosts({
        page: currentPage,
        limit: PAGE_LIMIT,
        search: debouncedSearch,
        start_date: filters?.startDate
          ? moment(filters.startDate).format("YYYY-MM-DD")
          : undefined,
        end_date: filters?.endDate
          ? moment(filters.endDate).format("YYYY-MM-DD")
          : undefined,
        name: filters?.name,
        /**
         * There is no `type` param on `/posts/` — the endpoint filters on the
         * boolean flags `post` / `proposing_idea` / `is_funding_required`
         * instead, and a `type=` value was accepted and silently ignored
         * (BE-05). The filter modal's own values are already those flag names,
         * so the selection becomes `<flag>=true`. Only `true` is parsed: `=1`
         * falls through to an unfiltered list.
         */
        ...(filters?.type ? { [filters.type]: true } : {}),
        tags: filters?.tags?.length ? filters?.tags : undefined,
      }),
    // A search or filter change rewrites the query key. Keeping the previous
    // results means `isLoading` stays false, so the posts are not replaced by
    // the full-screen loader on every keystroke — the search field shows a
    // small spinner instead, like /opportunities does.
    placeholderData: keepPreviousData,
  });

  // Only a fresh page-1 fetch (search/filter change) drives the search
  // field's small spinner — paging further down shouldn't.
  const isSearching = isFetching && currentPage === 1;

  // Accumulate each page's posts, de-duplicated by id. Processes a given
  // `posts` response object exactly once — gated during render rather than
  // in an effect, same reasoning as the reset above.
  const [processedPosts, setProcessedPosts] = useState(posts);
  if (posts?.data && posts !== processedPosts) {
    setProcessedPosts(posts);

    if (currentPage === 1) {
      const uniquePosts = posts.data.filter(
        (post: PostItem, index: number, self: PostItem[]) =>
          index === self.findIndex((p) => p.id === post.id)
      );
      setAllPosts(uniquePosts);
    } else {
      setAllPosts((previous) => {
        const existingIds = new Set(previous.map((p) => p.id));
        const newPosts = posts.data.filter(
          (post: PostItem) => !existingIds.has(post.id)
        );
        return [...previous, ...newPosts];
      });
    }

    setHasMore(currentPage < (posts?.meta?.pagination?.total_pages || 1));
  }

  const loadMore = () => {
    if (hasMore && !isFetching) {
      setCurrentPage((previous) => previous + 1);
    }
  };

  const isInitialLoading = isLoading && currentPage === 1 && allPosts.length === 0;
  const hasNoPosts = !isInitialLoading && allPosts.length === 0;

  return (
    <>
      <div className="mobilescreen:pb-[40px] pb-[40px] 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] py-[40px] border-t border-[#000]">
        {isInitialLoading ? <Loader /> : <ForsaCommunity />}
        <Post
          refetch={refetch}
          openfilter={openfilter}
          setOpenfilter={setOpenfilter}
          onApply={handleApplyFilters}
          initialValues={filters}
          setSearchQuery={setSearchQuery}
          isSearching={isSearching}
        />
        <div className="2xl:px-5 px-3 mobilescreen:px-[13px] 2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto relative">
          {isInitialLoading ? (
            <Loader />
          ) : hasNoPosts ? (
            <div className="text-center py-8 text-secondary-102 text-lg font-medium">
              {t("COMMON.NO_POSTS_AVAILABLE")}
            </div>
          ) : (
            <InnerPost data={allPosts[0]} refetch={refetch} />
          )}
          {!isInitialLoading && allPosts.length > 1 && (
            <div className="mt-5">
              <InnerPost data={allPosts[1]} refetch={refetch} />
            </div>
          )}
        </div>
        <AddBanner />
        <div className="2xl:px-5 px-3 mobilescreen:px-[13px] 2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto relative">
          {isInitialLoading ? (
            <Loader />
          ) : (
            allPosts.length > 2 && (
              <InfiniteScroll
                dataLength={allPosts.length - 2}
                next={loadMore}
                hasMore={hasMore}
                hasChildren={allPosts.length > 2}
                loader={<Loader inline />}
                endMessage={
                  <p className="text-center py-4 text-secondary-102">
                    {t("COMMON.NO_MORE_POSTS")}
                  </p>
                }
              >
                {allPosts.slice(2).map((post, index) => (
                  <div key={post.id} className={index > 0 ? "mt-5" : ""}>
                    <InnerPost data={post} refetch={refetch} />
                  </div>
                ))}
              </InfiniteScroll>
            )
          )}
        </div>
      </div>
    </>
  );
}

export default Community;
export { Community };
