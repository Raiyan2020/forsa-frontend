"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import moment from "moment";
import { BsThreeDots } from "react-icons/bs";
import { MdDelete, MdEdit } from "react-icons/md";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import {
  deleteCommunityPost,
  getCommunityPostById,
  likeCommunityPost,
} from "@/features/services/api";
import { getDefaultProfileImage } from "@/lib/helpers";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import CreatePostModal from "./CreatePostModal";
import { PostData } from "./InnerPost";
import ReplyForm from "./ReplyForm";
import UserReply from "./UserReply";

const asset = (path: string) => `/assets/${path}`;

// Helper function to render text with clickable hashtags
const renderTextWithHashtags = (
  text: string,
  onTagClick: (tag: string) => void
): React.ReactNode => {
  if (!text) return null;

  // \p{L} matches any Unicode letter, so Arabic hashtags work too
  const hashtagRegex = /#([\p{L}\p{N}_]+)/gu;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = hashtagRegex.exec(text)) !== null) {
    // Add the text before the hashtag
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.substring(lastIndex, match.index)}
        </span>
      );
    }

    // Add the hashtag as a clickable element
    const tag = match[1]; // The tag without the # symbol
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

  // Add any remaining text after the last hashtag
  if (lastIndex < text.length) {
    parts.push(<span key="text-end">{text.substring(lastIndex)}</span>);
  }

  // If no hashtags found, return the original text
  if (parts.length === 0) return text;

  return <>{parts}</>;
};

function relativeTime(createdAt: string | undefined, language: string, t: (k: string) => string) {
  if (!createdAt || !moment(createdAt).isValid()) {
    return t("COMMON.LOADING_TIME") || "Invalid date";
  }

  const now = moment();
  const created = moment(createdAt);
  const secondsDiff = now.diff(created, "seconds");
  const minutesDiff = now.diff(created, "minutes");
  const hoursDiff = now.diff(created, "hours");
  const daysDiff = now.diff(created, "days");

  if (language === "ar") {
    if (secondsDiff < 60) return "منذ ثوانٍ";
    if (minutesDiff < 60)
      return `منذ ${minutesDiff} ${minutesDiff === 1 ? "دقيقة" : "دقائق"}`;
    if (hoursDiff < 24)
      return `منذ ${hoursDiff} ${hoursDiff === 1 ? "ساعة" : "ساعات"}`;
    return `منذ ${daysDiff} ${daysDiff === 1 ? "يوم" : "أيام"}`;
  }

  if (secondsDiff < 60) return "few seconds ago";
  if (minutesDiff < 60)
    return `${minutesDiff} ${minutesDiff === 1 ? "minute" : "minutes"} ago`;
  if (hoursDiff < 24)
    return `${hoursDiff} ${hoursDiff === 1 ? "hour" : "hours"} ago`;
  return `${daysDiff} ${daysDiff === 1 ? "day" : "days"} ago`;
}

export default function CommunityDetailPage({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const router = useRouter();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const authToken = useAuthStore((s) => s.user?.auth_token);

  const likeMutation = useMutation({ mutationFn: likeCommunityPost });
  const deleteMutation = useMutation({ mutationFn: deleteCommunityPost });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReplyCreated, setIsReplyCreated] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [opencreatepost, setcreatepost] = useState(false);
  const [openDeleteConfirmModal, setOpenDeleteConfirmModal] = useState(false);
  const [isPostSubmitting, setIsPostSubmitting] = useState(false);
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [localPostData, setLocalPostData] = useState<PostData["data"] | null>(
    null
  );
  const validateFormRef = useRef<(() => Promise<boolean>) | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    data: apiResponse,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["community-post", id, Boolean(authToken)],
    queryFn: () => getCommunityPostById(id),
    enabled: Boolean(id),
  });

  const postData: PostData["data"] | undefined = Array.isArray(apiResponse?.data)
    ? apiResponse?.data[0]
    : apiResponse?.data;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (postData) {
      setLocalPostData(postData);
    }
  }, [postData]);

  // A missing post means the id is bogus — send the visitor home.
  useEffect(() => {
    if (!isLoading && !postData) {
      router.replace("/");
    }
  }, [isLoading, postData, router]);

  const handlePostLike = async (postId: string) => {
    if (!authToken) {
      toast.info(t("COMMON.LOGIN_TO_LIKE_POST"));
      return;
    }

    // Optimistic update - immediately update local state
    const previousData = localPostData;
    setLocalPostData((prev) =>
      prev
        ? {
            ...prev,
            is_liked: !prev.is_liked,
            likes_count: prev.is_liked
              ? prev.likes_count - 1
              : prev.likes_count + 1,
          }
        : prev
    );

    try {
      await likeMutation.mutateAsync({ post_id: postId });
      // Refetch in background to sync with server
      refetch();
    } catch {
      // Revert optimistic update on error
      setLocalPostData(previousData);
      toast.error(t("COMMON.LIKE_FAILED"));
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDropdown(false);
    setcreatepost(true);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDropdown(false);
    setOpenDeleteConfirmModal(true);
  };

  const handleImageClick = (imageUrl: string) => {
    // Open the image in a new tab/window
    window.open(imageUrl, "_blank");
  };

  // Handle tag click
  const handleTagClick = (tag: string) => {
    // Encoded because Arabic hashtags are the common case here.
    router.push(`/Community-List?tag=${encodeURIComponent(tag)}`);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteMutation.mutateAsync(postData!.id);
      toast.success(t("COMMON.TOAST.POST_DELETED_SUCCESSFULLY"));
      setOpenDeleteConfirmModal(false);
      router.push("/community"); // Redirect to community page after deletion
    } catch (err: any) {
      const payload = err?.response?.data;
      if (payload?.errors && Object.keys(payload.errors).length > 0) {
        Object.keys(payload.errors).forEach((key) => {
          const errorMessage =
            payload.errors[key][selectedLanguage] ||
            t("COMMON.TOAST.DELETE_POST_FAILED");
          toast.error(errorMessage);
        });
      } else if (payload?.message_en || payload?.message_ar) {
        toast.error(
          payload[`message_${selectedLanguage}`] ||
            t("COMMON.TOAST.DELETE_POST_FAILED")
        );
      } else {
        toast.error(t("COMMON.TOAST.DELETE_POST_FAILED"));
      }
    }
  };

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (postData?.id) {
      if (validateFormRef.current) {
        const isValid = await validateFormRef.current();
        if (isValid) {
          setOpenConfirmModal(true);
        }
      }
    } else if (formRef.current) {
      formRef.current.requestSubmit();
    }
  };

  const handleConfirmUpdate = () => {
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
    setOpenConfirmModal(false);
  };

  if (isLoading || !postData) {
    return <Loader />;
  }

  const postUser = postData.user;
  const profileUrl = postUser
    ? !postUser.is_public && postUser.user_type === "volunteer"
      ? `/volunteer-private-profile/${postUser.id}`
      : `/public-profile/${postUser.id}`
    : "/";

  return (
    <>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("COMMON.REPLY_FORM")}
        size="md"
        footer={
          <div className="flex xs:flex-col justify-center w-full gap-5">
            <Button
              variant="primary"
              size="medium"
              className="xs:!w-full"
              onClick={() => {
                const form = document.querySelector("form") as HTMLFormElement;
                if (form) form.requestSubmit();
              }}
              disabled={isSubmitting}
            >
              {t("COMMON.SUBMIT")}
            </Button>
          </div>
        }
      >
        <ReplyForm
          postId={postData.id}
          onLoadingChange={(loading) => setIsSubmitting(loading)}
          afterReplyCreation={() => {
            setOpen(false);
            setIsReplyCreated((prev) => !prev); // Toggle to trigger re-render
            refetch(); // Update post data including reply count
          }}
        />
      </Modal>

      <Modal
        open={opencreatepost}
        onClose={() => setcreatepost(false)}
        title={t("COMMON.UPDATE_POST")}
        size="md"
        footer={
          <div className="flex xss:flex-col justify-center w-full gap-5">
            <Button
              variant="primary"
              size="medium"
              className="xss:!w-full"
              onClick={handleSaveClick}
              disabled={isPostSubmitting}
            >
              {t("COMMON.SAVE")}
            </Button>
            <Button
              variant="secondary"
              size="medium"
              className="xss:!w-full"
              onClick={() => setcreatepost(false)}
              disabled={isPostSubmitting}
            >
              {t("COMMON.CANCEL")}
            </Button>
          </div>
        }
      >
        <CreatePostModal
          onLoadingChange={(loading) => setIsPostSubmitting(loading)}
          afterPostCreation={() => {
            setcreatepost(false);
          }}
          refetch={refetch}
          id={postData.id}
          formRef={formRef}
          validateFormRef={validateFormRef}
          key={opencreatepost ? "open" : "closed"} // Force re-render on open
        />
      </Modal>

      {/* Confirmation Modal for Update */}
      <Modal
        open={openConfirmModal}
        onClose={() => setOpenConfirmModal(false)}
        title={t("COMMON.UPDATE_POST")}
        size="sm"
        footer={
          <div className="flex xss:flex-col justify-center w-full gap-5">
            <Button
              variant="primary"
              size="medium"
              className="xss:!w-full"
              onClick={handleConfirmUpdate}
              disabled={isPostSubmitting}
            >
              {t("COMMON.CONFIRM")}
            </Button>
            <Button
              variant="secondary"
              size="medium"
              className="xss:!w-full"
              onClick={() => setOpenConfirmModal(false)}
              disabled={isPostSubmitting}
            >
              {t("COMMON.CANCEL")}
            </Button>
          </div>
        }
      >
        <h2 className="text-center pb-10 text-lg">
          {t("COMMON.ARE_YOU_SURE_UPDATE_COMMUNITY_POST")}
        </h2>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={openDeleteConfirmModal}
        onClose={() => setOpenDeleteConfirmModal(false)}
        title={t("COMMON.DELETE_POST")}
        size="sm"
        footer={
          <div className="flex xss:flex-col justify-center w-full gap-5">
            <Button
              variant="primary"
              size="medium"
              className="xss:!w-full"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {t("COMMON.CONFIRM")}
            </Button>
            <Button
              variant="secondary"
              size="medium"
              className="xss:!w-full"
              onClick={() => setOpenDeleteConfirmModal(false)}
              disabled={deleteMutation.isPending}
            >
              {t("COMMON.CANCEL")}
            </Button>
          </div>
        }
      >
        <h2 className="text-center pb-10 text-lg">
          {t("COMMON.ARE_YOU_SURE_DELETE_POST")}
        </h2>
      </Modal>

      <div className="mobilescreen:pb-[40px] pb-[40px] 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] py-[40px] border-t border-[#000]">
        <div className="2xl:px-5 px-3 mobilescreen:px-[13px] 2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto relative">
          {/* Three Dots Menu */}
          <div
            className={`absolute top-4 ${
              selectedLanguage === "ar" ? "left-4" : "right-4"
            }`}
            ref={dropdownRef}
          >
            {postData.is_creator && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDropdown(!showDropdown);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
              >
                <BsThreeDots className="text-primary-5 text-lg h-[30px] w-[30px]" />
              </button>
            )}

            {/* Dropdown Menu */}
            {showDropdown && (
              <div
                className={`absolute top-full mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-20 ${
                  selectedLanguage === "ar" ? "left-0" : "right-0"
                }`}
              >
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-t-lg transition-colors duration-200"
                >
                  <MdEdit className="text-primary-5" />
                  <span className="text-sm">{t("COMMON.EDIT_TEXT")}</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 w-full px-4 py-2 text-left text-red-600 hover:bg-gray-50 rounded-b-lg transition-colors duration-200"
                >
                  <MdDelete className="text-red-500" />
                  <span className="text-sm">{t("COMMON.DELETE")}</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 mb-4">
            {postUser && (
              <Image
                className="rounded-full w-[84px] h-[84px] object-cover mobilescreen:w-[50px] mobilescreen:h-[50px] border-2 border-primary-5 cursor-pointer"
                src={
                  postUser.profile_pic ||
                  getDefaultProfileImage(
                    postUser.gender_display?.value_en,
                    asset("profile/male_profile.svg"),
                    asset("profile/female_profile.svg"),
                    asset("profile/org_profile.svg")
                  )
                }
                alt={postData.nickname || postUser.full_name}
                width={84}
                height={84}
                unoptimized
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(profileUrl);
                }}
              />
            )}
            <div className="gap-3 items-center">
              <h3 className="font-bold text-xl xs:text-base">
                {postData.nickname || postUser?.full_name}
              </h3>
              <p className="text-[#535151] text-lg xs:text-xs flex gap-1">
                • {relativeTime(postData.created_at, selectedLanguage, t)}
              </p>
            </div>
          </div>

          <div className="mb-4">
            <h2 className="text-xl xs:text-base font-bold mb-2 flex gap-3">
              {/* Idea badge only — the funding ("Needs Support") badge was removed. */}
              {postData.proposing_idea ? (
                <div
                  style={{
                    width: 60,
                    height: 36,
                    borderRadius: 20,
                    border: "1px solid #29246D",
                    background: "rgba(23, 10, 81, 0.05)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <Image
                    src={asset("community/idia.svg")}
                    style={{ width: 12, height: 19.25 }}
                    alt="Idea"
                    width={12}
                    height={20}
                  />
                </div>
              ) : null}
            </h2>
            <p className="text-[#535151] text-lg">
              {renderTextWithHashtags(
                selectedLanguage === "ar"
                  ? postData.idea_text_ar
                  : postData.idea_text_en,
                handleTagClick
              )}
            </p>
            {postData.post_images?.length > 0 && (
              <div
                className="flex pt-8 pb-4 overflow-x-auto space-x-4"
                id="style-1"
              >
                {postData.post_images.map((imageObj, index) => (
                  <Image
                    key={imageObj.id ?? index}
                    className="w-[300px] h-[200px] object-cover flex-shrink-0 snap-center cursor-pointer hover:opacity-90 transition-opacity duration-200"
                    src={imageObj.image}
                    width={300}
                    height={200}
                    unoptimized
                    onClick={() => handleImageClick(imageObj.image)}
                    title={t("COMMON.CLICK_TO_VIEW")}
                    alt={`Post image ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-4 items-center pb-8 border-b border-[#00000033]/20">
            <button
              disabled={likeMutation.isPending}
              onClick={() =>
                handlePostLike(String(localPostData?.id || postData.id))
              }
              className="flex items-center gap-[9px] text-gray-600 border border-primary-5 bg-[#170A510F]/5 rounded-3xl 2xl:px-5 px-3 xsmall:px-3 h-[36px] text-center justify-center"
            >
              <Image
                src={asset("community/purplethumb.svg")}
                alt="Like"
                width={20}
                height={20}
                className="w-5 h-5"
              />
              <span className="text-sm text-primary-5">
                {localPostData?.likes_count ?? postData.likes_count}
              </span>
            </button>
            <button
              onClick={() => {
                if (!authToken) {
                  toast.info(t("COMMON.LOGIN_TO_REPLY"));
                  return;
                }
                setOpen(true);
              }}
              className="flex items-center gap-[9px] text-gray-600 border border-primary-5 bg-[#170A510F]/5 rounded-3xl 2xl:px-5 px-3 xsmall:px-3 h-[36px] text-center justify-center"
            >
              <Image
                src={asset("community/message.svg")}
                alt="Reply"
                width={20}
                height={20}
              />
              <span className="text-sm text-primary-5">
                {postData.replies_count || 0}
              </span>
            </button>
          </div>

          <div className="pb-12">
            <UserReply
              postId={postData.id}
              isReplyCreated={isReplyCreated}
              onReplyDeleted={refetch}
            />
          </div>
        </div>
      </div>
    </>
  );
}
