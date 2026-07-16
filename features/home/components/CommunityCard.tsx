"use client";

import React, { useEffect, useRef, useState } from "react";
import Carousel from "react-multi-carousel";
import "react-multi-carousel/lib/styles.css";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BsThreeDots } from "react-icons/bs";
import { MdEdit, MdDelete } from "react-icons/md";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguageStore } from "@/store/languageStore";
import { toast } from "sonner";
import apiClient from "@/lib/api/client";
import Loader from "@/components/ui/Loader";
import Image from "next/image";


interface UserProfile {
  full_name: string;
  profile_pic: string | null;
  gender_display?: { value_en: string; value_ar: string };
}

interface PostData {
  id: number;
  nickname: string | null;
  idea_text_en: string;
  idea_text_ar: string;
  is_creator: boolean;
  user: UserProfile;
}

interface CommunityCardProps {
  posts: PostData[];
  onNavigationVisibilityChange?: (isVisible: boolean) => void;
  refetch?: () => void;
}

const responsive = {
  superLargeDesktop: { breakpoint: { max: 4000, min: 1200 }, items: 2 },
  desktop: { breakpoint: { max: 1200, min: 800 }, items: 2 },
  tablet: { breakpoint: { max: 800, min: 464 }, items: 1 },
  mobile: { breakpoint: { max: 464, min: 0 }, items: 1 },
};

const renderTextWithHashtags = (
  text: string,
  onTagClick: (tag: string) => void
): React.ReactNode => {
  if (!text) return null;

  const hashtagRegex = /#([\p{L}\p{N}_]+)/gu;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = hashtagRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.substring(lastIndex, match.index)}
        </span>
      );
    }

    const tag = match[1];
    parts.push(
      <span
        key={`tag-${match.index}`}
        className="text-blue-500 cursor-pointer hover:underline"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onTagClick(tag);
        }}
      >
        #{tag}
      </span>
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={`text-end`}>{text.substring(lastIndex)}</span>);
  }

  if (parts.length === 0) return text;
  return <>{parts}</>;
};

export default function CommunityCard({
  posts,
  onNavigationVisibilityChange,
  refetch,
}: CommunityCardProps) {
  const selectedLanguage = useLanguageStore((s) => s.language);
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [maxVisibleItems, setMaxVisibleItems] = useState(2);
  const carouselRef = useRef<Carousel>(null);
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setTotalItems(posts?.length || 0);
    const updateMaxVisibleItems = () => {
      if (window.innerWidth >= 1200) {
        setMaxVisibleItems(responsive.superLargeDesktop.items);
      } else if (window.innerWidth >= 800) {
        setMaxVisibleItems(responsive.desktop.items);
      } else {
        setMaxVisibleItems(responsive.tablet.items);
      }
    };
    updateMaxVisibleItems();
    window.addEventListener("resize", updateMaxVisibleItems);
    return () => window.removeEventListener("resize", updateMaxVisibleItems);
  }, [posts]);

  useEffect(() => {
    const isNavigationVisible = (posts?.length || 0) > maxVisibleItems;
    onNavigationVisibilityChange?.(isNavigationVisible);
  }, [posts?.length, maxVisibleItems, onNavigationVisibilityChange]);

  const goToPrevious = () => {
    if (carouselRef.current && currentSlide > 0) {
      carouselRef.current.previous(1);
      setCurrentSlide((prev) => Math.max(prev - 1, 0));
    }
  };

  const goToNext = () => {
    const maxSlideIndex = Math.max(0, totalItems - maxVisibleItems);
    if (carouselRef.current && currentSlide < maxSlideIndex) {
      carouselRef.current.next(1);
      setCurrentSlide((prev) => Math.min(prev + 1, maxSlideIndex));
    }
  };

  const handleDelete = async (postId: number) => {
    if (!confirm(t("COMMON.ARE_YOU_SURE_DELETE_POST") || "Are you sure you want to delete this post?")) {
      return;
    }

    try {
      await apiClient.delete(`/api/posts/${postId}/`);
      toast.success(t("COMMON.TOAST.POST_DELETED_SUCCESSFULLY") || "Post deleted successfully");
      refetch?.();
    } catch (err: any) {
      toast.error(t("COMMON.TOAST.DELETE_POST_FAILED") || "Failed to delete post");
    }
  };

  const hasNoPosts = (posts?.length || 0) === 0;

  if (!isMounted) {
    return <Loader />;
  }

  return (
    <div>
      {hasNoPosts ? (
        <div className="text-center py-8 text-white text-lg font-medium">
          {t("COMMON.NO_POSTS_AVAILABLE")}
        </div>
      ) : (
        <>
          <Carousel
            rtl={selectedLanguage === "ar"}
            ref={carouselRef}
            responsive={responsive}
            infinite
            autoPlay={false}
            showDots={true}
            arrows={false}
            keyBoardControl
            customTransition="transform 500ms ease-in-out"
            containerClass="carousel-container mobilescreen:pb-10 m-[5px] mobilescreen:m-1"
          >
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onDelete={() => handleDelete(post.id)}
                router={router}
                selectedLanguage={selectedLanguage}
                t={t}
              />
            ))}
          </Carousel>
          {posts?.length > maxVisibleItems && (
            <div className="flex justify-center mobilescreen:hidden">
              <button
                onClick={selectedLanguage === "ar" ? goToNext : goToPrevious}
                aria-label={t("COMMON.PREVIOUS") || "Previous"}
                disabled={
                  selectedLanguage === "ar"
                    ? currentSlide >= totalItems - maxVisibleItems
                    : currentSlide === 0
                }
                className="bg-white text-primary-5 p-3 rounded-full shadow-lg hover:bg-secondary-103 transition absolute top-[50%] left-[-60px] 2xl:left-[-75px] xl:left-[-50px] laptop:left-[-75px] lg:left-[-45px] md:left-[-40px] -translate-y-1/2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={selectedLanguage === "ar" ? goToPrevious : goToNext}
                aria-label={t("COMMON.NEXT") || "Next"}
                disabled={
                  selectedLanguage === "ar"
                    ? currentSlide === 0
                    : currentSlide >= totalItems - maxVisibleItems
                }
                className="bg-white text-primary-5 p-3 rounded-full shadow-lg hover:bg-secondary-103 transition absolute top-[50%] right-[-50px] 2xl:right-[-75px] xl:right-[-50px] laptop:right-[-75px] lg:right-[-45px] md:right-[-40px] -translate-y-1/2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface PostCardProps {
  post: PostData;
  onDelete: () => void;
  router: any;
  selectedLanguage: string;
  t: any;
}

function PostCard({ post, onDelete, router, selectedLanguage, t }: PostCardProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTagClick = (tag: string) => {
    router.push(`/Community-List?tag=${tag}`);
  };

  const getProfileImage = () => {
    if (post.user?.profile_pic) return post.user.profile_pic;
    const gender = post.user?.gender_display?.value_en;
    if (gender === "Male") return "/assets/profile/male_profile.svg";
    if (gender === "Female") return "/assets/profile/female_profile.svg";
    return "/assets/profile/org_profile.svg";
  };

  return (
    <div className="mx-4 mobilescreen:mx-[13px]">
      <Link href={`/community-detail/${post.id}`}>
        <div className="bg-white p-6 rounded-xl contributionboxshadow h-full relative min-h-[267px] max-h-[267px]">
          {post.is_creator && (
            <div
              className={`absolute top-4 ${selectedLanguage === "ar" ? "left-4" : "right-4"}`}
              ref={dropdownRef}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDropdown(!showDropdown);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                aria-label={t("COMMON.POST_OPTIONS") || "Post options"}
                aria-expanded={showDropdown}
              >
                <BsThreeDots className="text-primary-5 text-lg" aria-hidden="true" />
              </button>

              {showDropdown && (
                <div
                  className={`absolute top-full mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-20 ${
                    selectedLanguage === "ar" ? "left-0" : "right-0"
                  }`}
                >
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowDropdown(false);
                      router.push(`/edit-post/${post.id}`);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-t-lg transition-colors duration-200"
                  >
                    <MdEdit className="text-primary-5" />
                    <span className="text-sm">{t("COMMON.EDIT_TEXT")}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowDropdown(false);
                      onDelete();
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-left text-red-600 hover:bg-gray-50 rounded-b-lg transition-colors duration-200"
                  >
                    <MdDelete className="text-red-500" />
                    <span className="text-sm">{t("COMMON.DELETE")}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center mb-3 gap-4">
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-primary-5">
              <Image
                src={getProfileImage()}
                alt=""
                fill
                sizes="96px"
                className="object-cover"
                unoptimized
              />
            </div>
            <div>
              <h3 className="lg:text-xl mobilescreen:text-lg font-bold text-secondary-100">
                {post.nickname || post.user?.full_name}
              </h3>
            </div>
          </div>
          <div className="line-clamp-2 md:line-clamp-3 text-secondary-100 lg:text-lg mobilescreen:text-base mobilescreen:leading-[30px]">
            {renderTextWithHashtags(
              selectedLanguage === "ar" ? post.idea_text_ar : post.idea_text_en,
              handleTagClick
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

