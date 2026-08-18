"use client";

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import moment from "moment";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import ForsaCommunity from "./ForsaCommunity";
import Post from "./Post";
import AddBanner from "./AddBanner";
import InnerPost from "./InnerPost";
import Loader from "@/components/ui/Loader";
import { getCommunityPosts } from "@/features/services/api";
import { CommunityFiltersData } from "./CommunityFilterModal";

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

  const {
    data: posts,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["communityPosts", debouncedSearch, filters],
    queryFn: () =>
      getCommunityPosts({
        page: 1,
        limit: 22,
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
    // A search or filter change rewrites the query key. Keeping the previous
    // results means `isLoading` stays false, so the posts are not replaced by
    // the full-screen loader on every keystroke — the search field shows a
    // small spinner instead, like /opportunities does.
    placeholderData: keepPreviousData,
  });

  const isSearching = isFetching && !isLoading;

  const hasNoPosts = posts?.data?.length === 0 || !posts;

  useEffect(() => {
    refetch();
  }, [filters, debouncedSearch, refetch]);

  return (
    <>
      <div className="mobilescreen:pb-[40px] pb-[40px] 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] py-[40px] border-t border-[#000]">
        {isLoading ? <Loader /> : <ForsaCommunity />}
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
          {!hasNoPosts && isLoading ? (
            <Loader />
          ) : hasNoPosts ? (
            <div className="text-center py-8 text-secondary-102 text-lg font-medium">
              {t("COMMON.NO_POSTS_AVAILABLE")}
            </div>
          ) : (
            <InnerPost data={posts?.data[0]} refetch={refetch} />
          )}
          {isLoading ? (
            <Loader />
          ) : (
            posts?.data?.length > 1 && (
              <div className="mt-5">
                <InnerPost data={posts?.data[1]} refetch={refetch} />
              </div>
            )
          )}
        </div>
        <AddBanner />
        <div className="2xl:px-5 px-3 mobilescreen:px-[13px] 2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto relative">
          {isLoading ? (
            <Loader />
          ) : (
            posts?.data?.length > 2 &&
            posts.data.slice(2, 22).map((post: any, index: number) => (
              <div key={post.id} className={index > 0 ? "mt-5" : ""}>
                <InnerPost data={post} refetch={refetch} />
              </div>
            ))
          )}

          {posts?.data?.length > 2 && (
            <div className="flex mx-auto justify-center pt-[50px] ">
              <Link href="/Community-List">
                <span className="text-center text-primary-5 text-[25px] border-b border-primary-5 font-bold cursor-pointer">
                  {t("COMMON.VIEW_ALL")}
                </span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Community;
export { Community };
