"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import moment from "moment";
import InfiniteScroll from "react-infinite-scroll-component";

import Loader from "@/components/ui/Loader";
import { getCommunityPosts, getCommunityPostsByTag } from "@/features/community/services/communityApi";
import InnerPost, { PostData } from "./InnerPost";
import Post from "./Post";
import { CommunityFiltersData } from "./CommunityFilterModal";

type PostItem = PostData["data"];

const PAGE_LIMIT = 5;

export default function CommunityList() {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const searchParams = useSearchParams();

  // Extract tag from URL query parameters if it exists
  const tagFromUrl = searchParams.get("tag");
  const isTagView = Boolean(tagFromUrl);

  const [searchQuery, setSearchQuery] = useState("");
  const [openfilter, setOpenfilter] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // For infinite scroll
  const [allPosts, setAllPosts] = useState<PostItem[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const [filters, setFilters] = useState<CommunityFiltersData>({
    name: "",
    startDate: "",
    endDate: "",
    type: "",
    tags: [],
  });

  const handleApplyFilters = (
    newFilters: CommunityFiltersData,
    isClear = false
  ) => {
    setFilters(newFilters); // Update filters state
    if (!isClear) setOpenfilter(false); // Only close if not clear
    setCurrentPage(1);
    setAllPosts([]);
    setHasMore(true);
  };

  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip on first render to avoid clearing posts on initial load
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
      setAllPosts([]);
      setHasMore(true);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset infinite scroll when tag changes
  useEffect(() => {
    setCurrentPage(1);
    setAllPosts([]);
    setHasMore(true);
  }, [tagFromUrl]);

  // Use the tag-based query if a tag is provided in the URL
  const {
    data: tagPosts,
    isFetching: isTagLoading,
    refetch: refetchTagPosts,
  } = useQuery({
    queryKey: ["communityPostsByTag", tagFromUrl, currentPage],
    queryFn: () =>
      getCommunityPostsByTag({
        tag: tagFromUrl?.toLowerCase() || "",
        page: currentPage,
        limit: PAGE_LIMIT,
      }),
    enabled: isTagView,
  });

  // Use the regular post query if no tag is provided
  const {
    data: regularPosts,
    isFetching: isRegularLoading,
    refetch: refetchRegularPosts,
  } = useQuery({
    queryKey: [
      "communityPosts",
      currentPage,
      debouncedSearch,
      filters,
    ],
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
        type: filters?.type,
        tags: filters?.tags?.length ? filters?.tags : undefined,
      }),
    enabled: !isTagView,
  });

  // Combine the data and loading state
  const posts = isTagView ? tagPosts : regularPosts;
  const isLoading = isTagView ? isTagLoading : isRegularLoading;
  const refetch = isTagView ? refetchTagPosts : refetchRegularPosts;

  // Effect to accumulate posts data
  useEffect(() => {
    if (posts?.data) {
      const newData: PostItem[] = posts.data;

      if (currentPage === 1) {
        // Even for page 1, ensure no duplicates within the response itself
        const uniquePosts = newData.filter(
          (post, index, self) =>
            index === self.findIndex((p) => p.id === post.id)
        );
        setAllPosts(uniquePosts);
      } else {
        // Filter out duplicates by checking if post ID already exists
        setAllPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newPosts = newData.filter((post) => !existingIds.has(post.id));
          return [...prev, ...newPosts];
        });
      }
      setHasMore(currentPage < (posts?.meta?.pagination?.total_pages || 1));
    }
  }, [posts, currentPage]);

  // Function to load more data
  const loadMore = () => {
    if (hasMore && !isLoading) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  // Only show full-page loader on initial load (when we have no posts yet)
  if (isLoading && allPosts.length === 0 && currentPage === 1) {
    return <Loader />;
  }

  const hasNoPosts = allPosts.length === 0;

  return (
    <div className="border-t border-[#000] 2xl:py-[70px] laptopmain:py-[70px] laptop:py-[40px] lg:py-[40px] py-[40px]">
      {/* Heading - Only show when not in tag view */}
      {!isTagView && (
        <div className="">
          <Post
            refetch={refetch}
            openfilter={openfilter}
            setOpenfilter={setOpenfilter}
            onApply={handleApplyFilters}
            initialValues={filters}
            setSearchQuery={setSearchQuery}
            isViewAll
          />
        </div>
      )}

      {/* Show tag info when in tag view */}
      {isTagView && (
        <div className="2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto mb-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-primary-5">
              {t("COMMUNITY.POSTS_WITH_TAG")}{" "}
              <span className="text-blue-500">#{tagFromUrl}</span>
            </h1>
          </div>
        </div>
      )}

      <div className="2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto relative">
        {hasNoPosts ? (
          <div className="text-center py-8 text-secondary-102 text-lg font-medium lg:h-[310px] md:h-[210px] flex justify-center items-center">
            {isTagView
              ? t("COMMON.NO_POSTS_WITH_TAG", { tag: tagFromUrl })
              : t("COMMON.NO_POSTS_AVAILABLE")}
          </div>
        ) : (
          <InfiniteScroll
            dataLength={allPosts.length}
            next={loadMore}
            hasMore={hasMore}
            hasChildren={allPosts.length > 0}
            loader={<Loader inline />}
            endMessage={
              <p className="text-center py-4 text-secondary-102">
                {t("COMMON.NO_MORE_POSTS")}
              </p>
            }
          >
            {allPosts.map((post, index) => (
              <div key={post.id} className={index !== 0 ? "my-5" : "mb-5"}>
                <InnerPost data={post} refetch={refetch} />
              </div>
            ))}
          </InfiniteScroll>
        )}
      </div>
    </div>
  );
}
