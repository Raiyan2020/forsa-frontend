"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { BsThreeDots } from "react-icons/bs";
import { MdEdit, MdDelete } from "react-icons/md";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import {
  deleteReply,
  getCommunityReplies,
  likeCommunityPost,
} from "@/features/services/api";
import { cn, getDefaultProfileImage } from "@/lib/helpers";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import ReplyForm from "./ReplyForm";
import ReplyOfReplyForm from "./ReplyOfReplyForm";

const asset = (path: string) => `/assets/${path}`;

interface Reply {
  id: number;
  user: {
    id: number;
    profile_pic: string;
    full_name: string;
    gender_display?: { id: string; value_en: string; value_ar: string };
    user_type?: string;
    is_public?: boolean;
  };
  child_replies: Reply[];
  text_en: string;
  text_ar: string;
  likes_count: number;
  is_liked: boolean;
  is_creator: boolean;
  is_deleted: boolean;
  parent_is_deleted: boolean;
  isPlaceholder?: boolean;
  reply_images?: {
    id: number;
    image: string;
  }[];
}

interface UserReplyProps {
  postId: string;
  isReplyCreated: boolean;
  onReplyDeleted?: () => void;
}

interface ReplyItemProps {
  reply: Reply;
  index: number;
  totalSiblings: number;
  onLike: (replyId: string) => void;
  likeLoading: boolean;
  onEdit: (replyId: string) => void;
  onDelete: (replyId: string) => void;
  onReply: (replyId: string) => void;
  activeDropdown: string | null;
  setActiveDropdown: (id: string | null) => void;
  dropdownRefs: React.RefObject<{ [key: string]: HTMLDivElement | null }>;
  onNavigateToReply: (replyId: number) => void;
  onNavigateToProfile: (user: Reply["user"]) => void;
  onImageClick: (imageUrl: string) => void;
}

const ReplyItem = ({
  reply,
  index,
  totalSiblings,
  onLike,
  onEdit,
  onDelete,
  onReply,
  activeDropdown,
  setActiveDropdown,
  dropdownRefs,
  likeLoading,
  onNavigateToReply,
  onNavigateToProfile,
  onImageClick,
}: ReplyItemProps) => {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);

  // Count non-deleted child replies
  const childRepliesCount =
    reply.child_replies?.filter(
      (child) => !child.is_deleted || child.isPlaceholder
    ).length || 0;

  return (
    <div
      className={cn(
        "pb-5 mt-8 relative",
        index !== totalSiblings - 1 && "border-b border-[#00000033]/20"
      )}
    >
      {/* Show dropdown only for non-placeholder and non-deleted replies */}
      {!reply.isPlaceholder && !reply.is_deleted && reply.is_creator && (
        <div
          className={`absolute z-10 top-0 ${
            selectedLanguage === "ar" ? "left-4" : "right-4"
          }`}
          ref={(el) => {
            dropdownRefs.current[`reply-${reply.id}`] = el;
          }}
        >
          <button
            onClick={() =>
              setActiveDropdown(
                activeDropdown === `reply-${reply.id}`
                  ? null
                  : `reply-${reply.id}`
              )
            }
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
          >
            <BsThreeDots className="text-primary-5 text-lg" />
          </button>

          {activeDropdown === `reply-${reply.id}` && (
            <div
              className={`absolute top-full mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-20 ${
                selectedLanguage === "ar" ? "left-0" : "right-0"
              }`}
            >
              <button
                onClick={() => onEdit(String(reply.id))}
                className="flex items-center gap-2 w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-t-lg transition-colors duration-200"
              >
                <MdEdit className="text-primary-5" />
                <span className="text-sm">{t("COMMON.EDIT_TEXT")}</span>
              </button>
              <button
                onClick={() => onDelete(String(reply.id))}
                className="flex items-center gap-2 w-full px-4 py-2 text-left text-red-600 hover:bg-gray-50 rounded-b-lg transition-colors duration-200"
              >
                <MdDelete className="text-red-500" />
                <span className="text-sm">{t("COMMON.DELETE")}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Show profile section for non-placeholder replies */}
      {!reply.isPlaceholder ? (
        <div className="flex items-center gap-3 mb-4">
          <Image
            src={
              reply.user.profile_pic ||
              getDefaultProfileImage(
                reply.user.gender_display?.value_en,
                asset("profile/male_profile.svg"),
                asset("profile/dummyimg.png"),
                asset("profile/org_profile.svg")
              )
            }
            alt="User Profile"
            width={59}
            height={59}
            unoptimized
            className="rounded-full object-cover h-[59px] w-[59px] border-2 border-primary-5 cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onNavigateToProfile(reply.user);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onNavigateToProfile(reply.user);
              }
            }}
            role="button"
            tabIndex={0}
          />
          <h3
            className="font-bold text-xl xs:text-base cursor-pointer"
            onClick={() => onNavigateToReply(reply.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onNavigateToReply(reply.id);
              }
            }}
            role="button"
            tabIndex={0}
          >
            {reply.user.full_name}
          </h3>
        </div>
      ) : (
        <div className="mb-4">
          <p className="text-gray-500 italic text-base xs:text-xs xs:leading-[24px]">
            {t("COMMON.AUTHOR_DELETED_MESSAGE")}
          </p>
        </div>
      )}

      {/* Show content only for non-placeholder replies */}
      {!reply.isPlaceholder && (
        <>
          <div
            className="mb-4 cursor-pointer"
            onClick={() => onNavigateToReply(reply.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onNavigateToReply(reply.id);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <p className="text-[#535151] text-lg">
              {selectedLanguage === "en" ? reply.text_en : reply.text_ar}
            </p>
          </div>

          {reply.reply_images && reply.reply_images.length > 0 && (
            <div
              className="flex pt-4 pb-4 overflow-x-auto space-x-4 mb-4"
              id="style-1"
            >
              {reply.reply_images.map((imageObj, imageIndex) => (
                <Image
                  key={imageObj.id}
                  className="w-[300px] h-[200px] object-cover flex-shrink-0 snap-center cursor-pointer hover:opacity-90 transition-opacity duration-200"
                  src={imageObj?.image}
                  width={300}
                  height={200}
                  unoptimized
                  onClick={(e) => {
                    e.stopPropagation();
                    onImageClick(imageObj.image);
                  }}
                  title={t("COMMON.CLICK_TO_VIEW")}
                  alt={`Reply ${imageIndex + 1}`}
                />
              ))}
            </div>
          )}

          <div className="flex gap-4 items-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLike(String(reply.id));
              }}
              disabled={likeLoading}
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
                {reply.likes_count}
              </span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReply(String(reply.id));
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
                {childRepliesCount > 0 ? `${childRepliesCount}` : "0"}
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default function UserReply({
  isReplyCreated,
  postId,
  onReplyDeleted,
}: UserReplyProps) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const router = useRouter();
  const authToken = useAuthStore((s) => s.user?.auth_token);

  const likeMutation = useMutation({ mutationFn: likeCommunityPost });
  const deleteMutation = useMutation({ mutationFn: deleteReply });

  const [isNewReplyCreated, setIsNewReplyCreated] = useState(false);
  const [openReplyForm, setOpenReplyForm] = useState(false);
  const [openCreateReplyOfReplyForm, setOpenCreateReplyOfReplyForm] =
    useState(false);
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [openDeleteConfirmModal, setOpenDeleteConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyId, setReplyId] = useState("");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [localRepliesData, setLocalRepliesData] = useState<Reply[]>([]);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const formRef = useRef<HTMLFormElement | null>(null);
  const validateFormRef = useRef<(() => Promise<boolean>) | null>(null);

  const {
    data,
    isLoading: repliesLoading,
    refetch,
  } = useQuery({
    queryKey: ["community-replies", String(postId)],
    queryFn: () => getCommunityReplies(String(postId)),
    enabled: Boolean(postId),
  });

  useEffect(() => {
    refetch();
  }, [isReplyCreated, isNewReplyCreated, refetch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const clickedOutside = Object.values(dropdownRefs.current).every(
        (ref) => ref && !ref.contains(event.target as Node)
      );
      if (clickedOutside) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Sync local state with API data
  useEffect(() => {
    let repliesData: Reply[] = [];
    if (Array.isArray(data)) {
      repliesData = data;
    } else if (Array.isArray(data?.data)) {
      repliesData = data.data;
    }
    setLocalRepliesData(repliesData);
  }, [data]);

  // Only show top-level replies (no nesting)
  const topLevelReplies = localRepliesData.filter(
    (reply) => !reply.is_deleted || reply.isPlaceholder
  );

  const handleReplyLike = async (targetReplyId: string) => {
    if (!authToken) {
      toast.info(t("COMMON.LOGIN_TO_LIKE"));
      return;
    }

    // Optimistic update - immediately update local state
    const previousData = [...localRepliesData];
    setLocalRepliesData((prevReplies) =>
      prevReplies.map((reply) =>
        String(reply.id) === targetReplyId
          ? {
              ...reply,
              is_liked: !reply.is_liked,
              likes_count: reply.is_liked
                ? reply.likes_count - 1
                : reply.likes_count + 1,
            }
          : reply
      )
    );

    try {
      await likeMutation.mutateAsync({ reply_id: targetReplyId });
      // Refetch in background to sync with server
      refetch();
    } catch (error) {
      // Revert optimistic update on error
      setLocalRepliesData(previousData);
      console.error("Like failed:", error);
      toast.error(t("COMMON.LIKE_FAILED"));
    }
  };

  const handleEdit = (targetReplyId: string) => {
    setReplyId(targetReplyId);
    setActiveDropdown(null);
    setOpenReplyForm(true);
  };

  const handleDelete = (targetReplyId: string) => {
    setReplyId(targetReplyId);
    setActiveDropdown(null);
    setOpenDeleteConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteMutation.mutateAsync(replyId);
      toast.success(t("COMMON.REPLY_DELETED_SUCCESSFULLY"));
      setOpenDeleteConfirmModal(false);
      refetch();
      onReplyDeleted?.(); // Trigger post refetch
    } catch (err: any) {
      const payload = err?.response?.data;
      if (payload?.errors && Object.keys(payload.errors).length > 0) {
        Object.keys(payload.errors).forEach((key) => {
          const errorMessage =
            payload.errors[key][selectedLanguage] ||
            t("COMMON.DELETE_REPLY_FAILED");
          toast.error(errorMessage);
        });
      } else if (payload?.message_en || payload?.message_ar) {
        toast.error(
          payload[`message_${selectedLanguage}`] ||
            t("COMMON.DELETE_REPLY_FAILED")
        );
      } else {
        toast.error(t("COMMON.DELETE_REPLY_FAILED"));
      }
    }
  };

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (replyId) {
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

  const handleReply = (targetReplyId: string) => {
    if (!authToken) {
      toast.info(t("COMMON.LOGIN_TO_REPLY"));
      return;
    }
    setReplyId(targetReplyId);
    setOpenCreateReplyOfReplyForm(true);
  };

  const handleNavigateToReply = (targetReplyId: number) => {
    router.push(`/community/${postId}/reply/${targetReplyId}`);
  };

  const handleNavigateToProfile = (user: Reply["user"]) => {
    const profileUrl =
      !user.is_public && user.user_type === "volunteer"
        ? `/volunteer-private-profile/${user.id}`
        : `/public-profile/${user.id}`;
    router.push(profileUrl);
  };

  const handleImageClick = (imageUrl: string) => {
    // Open the image in a new tab/window
    window.open(imageUrl, "_blank");
  };

  if (repliesLoading) return <Loader />;

  return (
    <>
      <Modal
        open={openReplyForm}
        onClose={() => setOpenReplyForm(false)}
        title={t("COMMON.UPDATE_REPLY")}
        size="md"
        footer={
          <div className="flex xs:flex-col justify-center w-full gap-5">
            <Button
              variant="primary"
              size="medium"
              className="xs:!w-full"
              onClick={handleSaveClick}
              disabled={isSubmitting}
            >
              {t("COMMON.SAVE")}
            </Button>
            <Button
              variant="secondary"
              size="medium"
              className="xs:!w-full"
              onClick={() => setOpenReplyForm(false)}
              disabled={isSubmitting}
            >
              {t("COMMON.CANCEL")}
            </Button>
          </div>
        }
      >
        <ReplyForm
          postId={postId}
          replyId={replyId}
          onLoadingChange={setIsSubmitting}
          afterReplyCreation={() => {
            setOpenReplyForm(false);
            setIsNewReplyCreated(true);
            refetch();
          }}
          formRef={formRef}
          validateFormRef={validateFormRef}
        />
      </Modal>

      <Modal
        open={openCreateReplyOfReplyForm}
        onClose={() => setOpenCreateReplyOfReplyForm(false)}
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
        <ReplyOfReplyForm
          postId={postId}
          replyId={replyId}
          onLoadingChange={setIsSubmitting}
          afterReplyCreation={() => {
            setOpenCreateReplyOfReplyForm(false);
            setIsNewReplyCreated(true);
            refetch();
          }}
        />
      </Modal>

      <Modal
        open={openConfirmModal}
        onClose={() => setOpenConfirmModal(false)}
        title={t("COMMON.UPDATE_REPLY")}
        size="sm"
        footer={
          <div className="flex xs:flex-col justify-center w-full gap-5">
            <Button
              variant="primary"
              size="medium"
              className="xs:!w-full"
              onClick={handleConfirmUpdate}
              disabled={isSubmitting}
            >
              {t("COMMON.CONFIRM")}
            </Button>
            <Button
              variant="secondary"
              size="medium"
              className="xs:!w-full"
              onClick={() => setOpenConfirmModal(false)}
              disabled={isSubmitting}
            >
              {t("COMMON.CANCEL")}
            </Button>
          </div>
        }
      >
        <h2 className="text-center pb-10 text-lg">
          {t("COMMON.ARE_YOU_SURE_UPDATE_REPLY")}
        </h2>
      </Modal>

      <Modal
        open={openDeleteConfirmModal}
        onClose={() => setOpenDeleteConfirmModal(false)}
        title={t("COMMON.DELETE_REPLY")}
        size="sm"
        footer={
          <div className="flex xs:flex-col justify-center w-full gap-5">
            <Button
              variant="primary"
              size="medium"
              className="xs:!w-full"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {t("COMMON.CONFIRM")}
            </Button>
            <Button
              variant="secondary"
              size="medium"
              className="xs:!w-full"
              onClick={() => setOpenDeleteConfirmModal(false)}
              disabled={deleteMutation.isPending}
            >
              {t("COMMON.CANCEL")}
            </Button>
          </div>
        }
      >
        <h2 className="text-center text-lg pb-10">
          {t("COMMON.ARE_YOU_SURE_DELETE_REPLY")}
        </h2>
      </Modal>

      <div>
        <h3 className="font-bold text-xl my-4">
          {topLevelReplies.length === 1
            ? t("COMMON.REPLY")
            : t("COMMON.REPLIES")}{" "}
          ({topLevelReplies.length})
        </h3>

        {topLevelReplies.length === 0 ? (
          <div className="text-center py-8 text-secondary-102 text-lg font-medium">
            {t("COMMON.NO_REPLIES")}
          </div>
        ) : (
          topLevelReplies.map((reply, index) => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              index={index}
              totalSiblings={topLevelReplies.length}
              onLike={handleReplyLike}
              likeLoading={likeMutation.isPending}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReply={handleReply}
              activeDropdown={activeDropdown}
              setActiveDropdown={setActiveDropdown}
              dropdownRefs={dropdownRefs}
              onNavigateToReply={handleNavigateToReply}
              onNavigateToProfile={handleNavigateToProfile}
              onImageClick={handleImageClick}
            />
          ))
        )}
      </div>
    </>
  );
}
