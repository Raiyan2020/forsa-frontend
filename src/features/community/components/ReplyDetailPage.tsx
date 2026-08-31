"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { BsThreeDots } from "react-icons/bs";
import { MdDelete, MdEdit } from "react-icons/md";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import {
  deleteReply,
  getCommunityReplies,
  likeCommunityPost,
} from "@/features/services/api";
import { getDefaultProfileImage } from "@/lib/helpers";
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
  created_at?: string;
  reply_images?: {
    id: number;
    image: string;
  }[];
}

interface ReplyDetailPageProps {
  postId: string;
  replyId: string;
}

export default function ReplyDetailPage({
  postId,
  replyId,
}: ReplyDetailPageProps) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const router = useRouter();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const authToken = useAuthStore((s) => s.user?.auth_token);

  const likeMutation = useMutation({ mutationFn: likeCommunityPost });
  const deleteMutation = useMutation({ mutationFn: deleteReply });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReplyCreated, setIsReplyCreated] = useState(false);
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  const [openEditReplyModal, setOpenEditReplyModal] = useState(false);
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [openDeleteConfirmModal, setOpenDeleteConfirmModal] = useState(false);
  const [selectedReplyId, setSelectedReplyId] = useState("");
  const [replyToId, setReplyToId] = useState(""); // Track which reply we're replying to
  const [localRepliesData, setLocalRepliesData] = useState<Reply[]>([]);
  const validateFormRef = useRef<(() => Promise<boolean>) | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const {
    data: apiResponse,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["community-replies", String(postId)],
    queryFn: () => getCommunityReplies(String(postId)),
    enabled: Boolean(postId),
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const clickedOutside = Object.values(dropdownRefs.current).every(
        (ref) => ref && !ref.contains(event.target as Node)
      );
      if (clickedOutside) {
        setShowDropdown(null);
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
    if (Array.isArray(apiResponse)) {
      repliesData = apiResponse;
    } else if (Array.isArray(apiResponse?.data)) {
      repliesData = apiResponse.data;
    }
    setLocalRepliesData(repliesData);
  }, [apiResponse]);

  useEffect(() => {
    refetch();
  }, [authToken, isReplyCreated, refetch]);

  // Find the target reply and its children
  const findReply = (replies: Reply[], targetId: string): Reply | null => {
    for (const reply of replies) {
      if (String(reply.id) === targetId) {
        return reply;
      }
      if (reply.child_replies && reply.child_replies.length > 0) {
        const found = findReply(reply.child_replies, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  const targetReply = findReply(localRepliesData, replyId || "");

  // A reply that isn't in the tree means a stale link — go back.
  useEffect(() => {
    if (!isLoading && (!postId || !replyId || !targetReply)) {
      router.back();
    }
  }, [isLoading, postId, replyId, targetReply, router]);

  const handleReplyLike = async (likeReplyId: string) => {
    if (!authToken) {
      toast.info(t("COMMON.LOGIN_TO_LIKE"));
      return;
    }

    // Optimistic update - immediately update local state
    const previousData = [...localRepliesData];
    const updateReplyInTree = (replies: Reply[]): Reply[] =>
      replies.map((reply) => {
        if (String(reply.id) === likeReplyId) {
          return {
            ...reply,
            is_liked: !reply.is_liked,
            likes_count: reply.is_liked
              ? reply.likes_count - 1
              : reply.likes_count + 1,
          };
        }
        if (reply.child_replies && reply.child_replies.length > 0) {
          return {
            ...reply,
            child_replies: updateReplyInTree(reply.child_replies),
          };
        }
        return reply;
      });
    setLocalRepliesData((prevReplies) => updateReplyInTree(prevReplies));

    try {
      await likeMutation.mutateAsync({ reply_id: likeReplyId });
      // Refetch in background to sync with server
      refetch();
    } catch (error) {
      // Revert optimistic update on error
      setLocalRepliesData(previousData);
      console.error("Like failed:", error);
      toast.error(t("COMMON.LIKE_FAILED"));
    }
  };

  const handleEdit = (editReplyId: string) => {
    setSelectedReplyId(editReplyId);
    setShowDropdown(null);
    setOpenEditReplyModal(true);
  };

  const handleDelete = (deleteReplyId: string) => {
    setSelectedReplyId(deleteReplyId);
    setShowDropdown(null);
    setOpenDeleteConfirmModal(true);
  };

  const handleImageClick = (imageUrl: string) => {
    // Open the image in a new tab/window
    window.open(imageUrl, "_blank");
  };

  const navigateToProfile = (user: Reply["user"]) => {
    router.push(
      !user.is_public && user.user_type === "volunteer"
        ? `/volunteer-private-profile/${user.id}`
        : `/public-profile/${user.id}`
    );
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteMutation.mutateAsync(selectedReplyId);
      toast.success(t("COMMON.REPLY_DELETED_SUCCESSFULLY"));
      setOpenDeleteConfirmModal(false);
      refetch();
      // Navigate back if deleting the main reply
      if (selectedReplyId === replyId) {
        router.back();
      }
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
    if (selectedReplyId) {
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

  const handleNavigateToReply = (childReplyId: number) => {
    router.push(`/community/${postId}/reply/${childReplyId}`);
  };

  if (isLoading || !targetReply) {
    return <Loader />;
  }

  // Only show direct children (not nested)
  const directReplies =
    targetReply.child_replies?.filter(
      (reply) => !reply.is_deleted || reply.isPlaceholder
    ) || [];

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
        <ReplyOfReplyForm
          postId={postId || ""}
          replyId={replyToId || replyId || ""}
          onLoadingChange={(loading) => setIsSubmitting(loading)}
          afterReplyCreation={() => {
            setOpen(false);
            setIsReplyCreated((prev) => !prev);
            setReplyToId(""); // Reset after creation
          }}
        />
      </Modal>

      <Modal
        open={openEditReplyModal}
        onClose={() => setOpenEditReplyModal(false)}
        title={t("COMMON.UPDATE_REPLY")}
        size="md"
        footer={
          <div className="flex xss:flex-col justify-center w-full gap-5">
            <Button
              variant="primary"
              size="medium"
              className="xss:!w-full"
              onClick={handleSaveClick}
              disabled={isSubmitting}
            >
              {t("COMMON.SAVE")}
            </Button>
            <Button
              variant="secondary"
              size="medium"
              className="xss:!w-full"
              onClick={() => setOpenEditReplyModal(false)}
              disabled={isSubmitting}
            >
              {t("COMMON.CANCEL")}
            </Button>
          </div>
        }
      >
        <ReplyForm
          postId={postId || ""}
          replyId={selectedReplyId}
          onLoadingChange={(loading) => setIsSubmitting(loading)}
          afterReplyCreation={() => {
            setOpenEditReplyModal(false);
            refetch();
          }}
          formRef={formRef}
          validateFormRef={validateFormRef}
        />
      </Modal>

      {/* Update Confirmation Modal */}
      <Modal
        open={openConfirmModal}
        onClose={() => setOpenConfirmModal(false)}
        title={t("COMMON.UPDATE_REPLY")}
        size="sm"
        footer={
          <div className="flex xss:flex-col justify-center w-full gap-5">
            <Button
              variant="primary"
              size="medium"
              className="xss:!w-full"
              onClick={handleConfirmUpdate}
              disabled={isSubmitting}
            >
              {t("COMMON.CONFIRM")}
            </Button>
            <Button
              variant="secondary"
              size="medium"
              className="xss:!w-full"
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

      {/* Delete Confirmation Modal */}
      <Modal
        open={openDeleteConfirmModal}
        onClose={() => setOpenDeleteConfirmModal(false)}
        title={t("COMMON.DELETE_REPLY")}
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
          {t("COMMON.ARE_YOU_SURE_DELETE_REPLY")}
        </h2>
      </Modal>

      <div className="mobilescreen:pb-[40px] pb-[40px] 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] py-[40px] border-t border-[#000]">
        <div className="2xl:px-5 px-3 mobilescreen:px-[13px] 2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto relative">
          {/* Three Dots Menu */}
          <div
            className={`absolute top-4 ${
              selectedLanguage === "ar" ? "left-4" : "right-4"
            }`}
            ref={(el) => {
              dropdownRefs.current[`reply-${targetReply.id}`] = el;
            }}
          >
            {targetReply.is_creator && !targetReply.is_deleted && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDropdown(
                    showDropdown === `reply-${targetReply.id}`
                      ? null
                      : `reply-${targetReply.id}`
                  );
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
              >
                <BsThreeDots className="text-primary-5 text-lg h-[30px] w-[30px]" />
              </button>
            )}

            {/* Dropdown Menu */}
            {showDropdown === `reply-${targetReply.id}` && (
              <div
                className={`absolute top-full mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-20 ${
                  selectedLanguage === "ar" ? "left-0" : "right-0"
                }`}
              >
                <button
                  onClick={() => handleEdit(String(targetReply.id))}
                  className="flex items-center gap-2 w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-t-lg transition-colors duration-200"
                >
                  <MdEdit className="text-primary-5" />
                  <span className="text-sm">{t("COMMON.EDIT_TEXT")}</span>
                </button>
                <button
                  onClick={() => handleDelete(String(targetReply.id))}
                  className="flex items-center gap-2 w-full px-4 py-2 text-left text-red-600 hover:bg-gray-50 rounded-b-lg transition-colors duration-200"
                >
                  <MdDelete className="text-red-500" />
                  <span className="text-sm">{t("COMMON.DELETE")}</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 mb-4">
            <Image
              className="rounded-full w-[84px] h-[84px] object-cover mobilescreen:w-[50px] mobilescreen:h-[50px] border-2 border-primary-5 cursor-pointer"
              src={
                targetReply.user.profile_pic ||
                getDefaultProfileImage(
                  targetReply.user.gender_display?.value_en,
                  asset("profile/male_profile.svg"),
                  asset("profile/female_profile.svg"),
                  asset("profile/org_profile.svg")
                )
              }
              alt={targetReply.user.full_name}
              width={84}
              height={84}
              unoptimized
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigateToProfile(targetReply.user);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigateToProfile(targetReply.user);
                }
              }}
              role="button"
              tabIndex={0}
            />
            <div className="gap-3 items-center">
              <h3 className="font-bold text-xl xs:text-base">
                {targetReply.user.full_name}
              </h3>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-[#535151] text-lg">
              {selectedLanguage === "ar"
                ? targetReply.text_ar
                : targetReply.text_en}
            </p>
          </div>

          {targetReply.reply_images && targetReply.reply_images.length > 0 && (
            <div
              className="flex pt-4 pb-4 overflow-x-auto space-x-4 mb-4"
              id="style-1"
            >
              {targetReply.reply_images.map((imageObj, index) => (
                <Image
                  key={imageObj.id}
                  className="w-[300px] h-[200px] object-cover flex-shrink-0 snap-center cursor-pointer hover:opacity-90 transition-opacity duration-200"
                  src={imageObj.image}
                  width={300}
                  height={200}
                  unoptimized
                  onClick={() => handleImageClick(imageObj.image)}
                  title={t("COMMON.CLICK_TO_VIEW")}
                  alt={`Reply ${index + 1}`}
                />
              ))}
            </div>
          )}

          <div className="flex gap-4 items-center pb-8 border-b border-[#00000033]/20">
            <button
              disabled={likeMutation.isPending}
              onClick={() => handleReplyLike(String(targetReply.id))}
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
                {targetReply.likes_count}
              </span>
            </button>
            <button
              onClick={() => {
                if (!authToken) {
                  toast.info(t("COMMON.LOGIN_TO_REPLY"));
                  return;
                }
                setReplyToId(String(targetReply.id)); // Set the reply target
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
                {directReplies.length}
              </span>
            </button>
          </div>

          {/* Replies Section */}
          <div className="pb-12">
            <h3 className="font-bold text-xl my-4">
              {directReplies.length === 1
                ? t("COMMON.REPLY")
                : t("COMMON.REPLIES")}{" "}
              ({directReplies.length})
            </h3>

            {directReplies.length === 0 ? (
              <div className="text-center py-8 text-secondary-102 text-lg font-medium">
                {t("COMMON.NO_REPLIES")}
              </div>
            ) : (
              <div>
                {directReplies.map((childReply, index) => (
                  <div
                    key={childReply.id}
                    className={`pb-5 mt-8 relative ${
                      index !== directReplies.length - 1
                        ? "border-b border-[#00000033]/20"
                        : ""
                    }`}
                  >
                    {/* Three Dots Menu for child reply */}
                    {childReply.is_creator && !childReply.is_deleted && (
                      <div
                        className={`absolute z-10 top-0 ${
                          selectedLanguage === "ar" ? "left-4" : "right-4"
                        }`}
                        ref={(el) => {
                          dropdownRefs.current[`reply-${childReply.id}`] = el;
                        }}
                      >
                        <button
                          onClick={() =>
                            setShowDropdown(
                              showDropdown === `reply-${childReply.id}`
                                ? null
                                : `reply-${childReply.id}`
                            )
                          }
                          className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                        >
                          <BsThreeDots className="text-primary-5 text-lg" />
                        </button>

                        {showDropdown === `reply-${childReply.id}` && (
                          <div
                            className={`absolute top-full mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-20 ${
                              selectedLanguage === "ar" ? "left-0" : "right-0"
                            }`}
                          >
                            <button
                              onClick={() => handleEdit(String(childReply.id))}
                              className="flex items-center gap-2 w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-t-lg transition-colors duration-200"
                            >
                              <MdEdit className="text-primary-5" />
                              <span className="text-sm">
                                {t("COMMON.EDIT_TEXT")}
                              </span>
                            </button>
                            <button
                              onClick={() =>
                                handleDelete(String(childReply.id))
                              }
                              className="flex items-center gap-2 w-full px-4 py-2 text-left text-red-600 hover:bg-gray-50 rounded-b-lg transition-colors duration-200"
                            >
                              <MdDelete className="text-red-500" />
                              <span className="text-sm">
                                {t("COMMON.DELETE")}
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {!childReply.isPlaceholder ? (
                      <>
                        <div className="flex items-center gap-3 mb-4">
                          <Image
                            src={
                              childReply.user.profile_pic ||
                              getDefaultProfileImage(
                                childReply.user.gender_display?.value_en,
                                asset("profile/male_profile.svg"),
                                asset("profile/female_profile.svg"),
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
                              navigateToProfile(childReply.user);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                navigateToProfile(childReply.user);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                          />
                          <h3
                            className="font-bold text-xl xs:text-base cursor-pointer"
                            onClick={() => handleNavigateToReply(childReply.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleNavigateToReply(childReply.id);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                          >
                            {childReply.user.full_name}
                          </h3>
                        </div>

                        <div
                          className="mb-4 cursor-pointer"
                          onClick={() => handleNavigateToReply(childReply.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleNavigateToReply(childReply.id);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <p className="text-[#535151] text-lg">
                            {selectedLanguage === "en"
                              ? childReply.text_en
                              : childReply.text_ar}
                          </p>
                        </div>

                        {childReply.reply_images &&
                          childReply.reply_images.length > 0 && (
                            <div
                              className="flex pt-4 pb-4 overflow-x-auto space-x-4 mb-4"
                              id="style-1"
                            >
                              {childReply.reply_images.map(
                                (imageObj, imageIndex) => (
                                  <Image
                                    key={imageObj.id}
                                    className="w-[300px] h-[200px] object-cover flex-shrink-0 snap-center cursor-pointer hover:opacity-90 transition-opacity duration-200"
                                    src={imageObj.image}
                                    width={300}
                                    height={200}
                                    unoptimized
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleImageClick(imageObj.image);
                                    }}
                                    title={t("COMMON.CLICK_TO_VIEW")}
                                    alt={`Reply ${imageIndex + 1}`}
                                  />
                                )
                              )}
                            </div>
                          )}

                        <div className="flex gap-4 items-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReplyLike(String(childReply.id));
                            }}
                            disabled={likeMutation.isPending}
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
                              {childReply.likes_count}
                            </span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!authToken) {
                                toast.info(t("COMMON.LOGIN_TO_REPLY"));
                                return;
                              }
                              setReplyToId(String(childReply.id)); // Target this child reply
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
                              {childReply.child_replies?.length || 0}
                            </span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="mb-4">
                        <p className="text-gray-500 italic text-base xs:text-xs xs:leading-[24px]">
                          {t("COMMON.AUTHOR_DELETED_MESSAGE")}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
