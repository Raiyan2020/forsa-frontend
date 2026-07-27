"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import moment from "moment";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import Contactus from "./Contactus";
import { useLanguageStore } from "@/store/languageStore";
import { useAuthStore } from "@/store/authStore";
import { BsThreeDots } from "react-icons/bs";
import { MdEdit, MdDelete } from "react-icons/md";
import { getDefaultProfileImage } from "@/lib/helpers";

import {
  likeCommunityPost,
  deleteCommunityPost,
} from "@/features/services/api";

import ReplyForm from "./ReplyForm";
import CreatePostModal from "./CreatePostModal";

export interface PostData {
  data: {
    id: string;
    created_at: string;
    title_ar: string;
    title_en: string;
    idea_text_ar: string;
    idea_text_en: string;
    likes_count: number;
    replies_count: number;
    is_liked: boolean;
    is_creator: boolean;
    proposing_idea: boolean;
    is_funding_required: boolean;
    nickname?: string;
    user: {
      profile_pic: string;
      full_name: string;
      gender_display?: {
        id: number;
        value_en: string;
        value_ar: string;
      };
      is_public: boolean;
      user_type: string;
      id: string;
    };
    post_images: {
      id: string;
      image: string;
    }[];
    tags?: {
      id: number;
      name: string;
    }[];
  };
  refetch: () => void;
}

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
        className="text-blue-500 cursor-pointer hover:underline font-medium"
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

function InnerPost({ data, refetch }: PostData) {
  const [open, setOpen] = useState(false);
  const [openReplyForm, setOpenReplyForm] = useState(false);
  const [opencreatepost, setcreatepost] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [openDeleteConfirmModal, setOpenDeleteConfirmModal] = useState(false);
  const [state, setState] = useState(data?.proposing_idea ? 2 : 1);
  const [localPostData, setLocalPostData] = useState(data);

  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const authToken = user?.auth_token;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPostSubmitting, setIsPostSubmitting] = useState(false);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Mutations
  const likePostMutation = useMutation({
    mutationFn: likeCommunityPost,
  });

  const deletePostMutation = useMutation({
    mutationFn: deleteCommunityPost,
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const validateFormRef = useRef<(() => Promise<boolean>) | null>(null);

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
    setState(data?.proposing_idea ? 2 : 1);
  }, [data?.proposing_idea]);

  useEffect(() => {
    setLocalPostData(data);
  }, [data]);

  const handlePostLike = async (postId: string) => {
    if (!authToken) {
      toast.info(t("COMMON.LOGIN_TO_LIKE_POST"));
      return;
    }

    const previousData = localPostData;
    setLocalPostData((prev) => ({
      ...prev,
      is_liked: !prev.is_liked,
      likes_count: prev.is_liked ? prev.likes_count - 1 : prev.likes_count + 1,
    }));

    try {
      await likePostMutation.mutateAsync({ post_id: postId });
      refetch?.();
    } catch (error) {
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

  const handleConfirmDelete = async () => {
    try {
      await deletePostMutation.mutateAsync(data?.id);
      toast.success(t("COMMON.TOAST.POST_DELETED_SUCCESSFULLY"));
      setOpenDeleteConfirmModal(false);
      refetch?.();
    } catch (err: any) {
      const errorData = err?.response?.data || err?.data;
      if (errorData?.errors && Object.keys(errorData.errors).length > 0) {
        const errors = errorData.errors;
        Object.keys(errors).forEach((key) => {
          const errorMessage =
            errors[key][selectedLanguage] ||
            t("COMMON.TOAST.DELETE_POST_FAILED");
          toast.error(errorMessage);
        });
      } else if (errorData?.msg || errorData?.message_en || errorData?.message_ar) {
        toast.error(
          errorData?.msg ||
            errorData?.[`message_${selectedLanguage}`] ||
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
    if (data?.id) {
      if (validateFormRef.current) {
        const isValid = await validateFormRef.current();
        if (isValid) {
          setOpenConfirmModal(true);
        }
      }
    } else {
      if (formRef.current) {
        formRef.current.requestSubmit();
      }
    }
  };

  const handleConfirmUpdate = () => {
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
    setOpenConfirmModal(false);
  };

  const handleTagClick = (tag: string) => {
    router.push(`/Community-List?tag=${tag}`);
  };

  return (
    <div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("COMMON.CONTACT_US")}
        size="md"
        footer={
          <div className="flex xss:flex-col justify-center w-full gap-5">
            <Button
              variant="primary"
              size="medium"
              className="xss:!w-full"
              onClick={() => {
                const form = document.querySelector("form") as HTMLFormElement;
                if (form) form.requestSubmit();
              }}
              disabled={isSubmitting}
            >
              {t("COMMON.SEND")}
            </Button>
          </div>
        }
      >
        <Contactus
          postId={data?.id}
          onLoadingChange={(loading) => setIsSubmitting(loading)}
          afterReplyCreation={() => {
            setOpen(false);
          }}
        />
      </Modal>

      <Modal
        open={openReplyForm}
        onClose={() => setOpenReplyForm(false)}
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
              disabled={isSubmittingReply}
            >
              {t("COMMON.SUBMIT")}
            </Button>
          </div>
        }
      >
        <ReplyForm
          postId={data?.id}
          onLoadingChange={(loading) => setIsSubmittingReply(loading)}
          afterReplyCreation={() => {
            setOpenReplyForm(false);
            refetch?.();
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
          id={data?.id}
          formRef={formRef}
          validateFormRef={validateFormRef}
        />
      </Modal>

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
              disabled={deletePostMutation.isPending}
            >
              {t("COMMON.CONFIRM")}
            </Button>
            <Button
              variant="secondary"
              size="medium"
              className="xss:!w-full"
              onClick={() => setOpenDeleteConfirmModal(false)}
              disabled={deletePostMutation.isPending}
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

      <Link href={`/community-detail/${data?.id}`} className="block focus:outline-none">
        <div
          className={`border rounded-[20px] p-6 xsmall:p-3 smallscreen:p-[10px] relative shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] ${
            state === 1
              ? "bg-primary-5/5 border-primary-5"
              : "bg-[#FC95550D]/5 border-[#FC9555]"
          }`}
        >
          <div
            className={`absolute top-4 ${
              selectedLanguage === "ar" ? "left-4" : "right-4"
            }`}
            ref={dropdownRef}
          >
            {data?.is_creator && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDropdown(!showDropdown);
                }}
                className={`p-2 rounded-full transition-colors duration-200 ${
                  state === 1 ? "hover:bg-gray-100" : "hover:bg-[#f4c5a7]"
                }`}
                aria-label={t("COMMON.OPTIONS") || "Options"}
              >
                <BsThreeDots
                  className={`text-lg ${
                    state === 1 ? "text-primary-5" : "text-[#FC9555]"
                  }`}
                />
              </button>
            )}

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
            {(() => {
              const userObj = data?.user;
              if (!userObj) return null;
              const isPublic = userObj.is_public;
              const userType = userObj.user_type;
              const userId = userObj.id;
              const profileUrl =
                !isPublic && userType === "volunteer"
                  ? `/volunteer-private-profile/${userId}`
                  : `/public-profile/${userId}`;

              const defaultImgMale = "/assets/profile/male_profile.svg";
              const defaultImgFemale = "/assets/profile/female_profile.svg";
              const defaultImgOrg = "/assets/profile/org_profile.svg";

              return (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(profileUrl);
                  }}
                  className="relative w-[100px] h-[100px] mobilescreen:w-[50px] mobilescreen:h-[50px] flex-shrink-0 focus:outline-none"
                  aria-label={data?.nickname || data?.user?.full_name}
                >
                  <Image
                    className={`rounded-full object-cover border-2 ${
                      state === 1 ? "border-primary-5" : "border-primary-10"
                    }`}
                    src={
                      userObj?.profile_pic ||
                      getDefaultProfileImage(
                        userObj?.gender_display?.value_en,
                        defaultImgMale,
                        defaultImgFemale,
                        defaultImgOrg
                      )
                    }
                    alt=""
                    fill
                    unoptimized
                  />
                </button>
              );
            })()}
            <div className="gap-3 items-center">
              <h3 className="font-bold text-xl">
                {data?.nickname || data?.user?.full_name}
              </h3>
              <p className="text-[#535151] lg:text-base md:text-base mobilescreen:text-sm">
                •{" "}
                {(() => {
                  const createdAt = data?.created_at;
                  if (!createdAt || !moment(createdAt).isValid()) {
                    return t("COMMON.LOADING_TIME") || "Invalid date";
                  }

                  const now = moment();
                  const created = moment(createdAt);
                  const secondsDiff = now.diff(created, "seconds");
                  const minutesDiff = now.diff(created, "minutes");
                  const hoursDiff = now.diff(created, "hours");
                  const daysDiff = now.diff(created, "days");

                  if (selectedLanguage === "ar") {
                    if (secondsDiff < 60) {
                      return `منذ ثوانٍ`;
                    } else if (minutesDiff < 60) {
                      return `منذ ${minutesDiff} ${
                        minutesDiff === 1 ? "دقيقة" : "دقائق"
                      }`;
                    } else if (hoursDiff < 24) {
                      return `منذ ${hoursDiff} ${
                        hoursDiff === 1 ? "ساعة" : "ساعات"
                      }`;
                    } else {
                      return `منذ ${daysDiff} ${
                        daysDiff === 1 ? "يوم" : "أيام"
                      }`;
                    }
                  } else {
                    if (secondsDiff < 60) {
                      return `few seconds ago`;
                    } else if (minutesDiff < 60) {
                      return `${minutesDiff} ${
                        minutesDiff === 1 ? "minute" : "minutes"
                      } ago`;
                    } else if (hoursDiff < 24) {
                      return `${hoursDiff} ${
                        hoursDiff === 1 ? "hour" : "hours"
                      } ago`;
                    } else {
                      return `${daysDiff} ${
                        daysDiff === 1 ? "day" : "days"
                      } ago`;
                    }
                  }
                })()}
              </p>
            </div>
          </div>

          <div className="mb-4">
            <h2 className="text-xl font-bold mb-2 flex gap-3 items-center">
              {data?.proposing_idea || data?.is_funding_required ? (
                <div
                  className="flex items-center justify-center gap-1.5 border border-[#FC9555] bg-[#FAEADD] rounded-[20px]"
                  style={{
                    width:
                      data?.proposing_idea && data?.is_funding_required
                        ? 72
                        : 60,
                    height: 36,
                  }}
                >
                  {data?.proposing_idea && (
                    <div className="relative w-[12px] h-[19px]">
                      <Image
                        src="/assets/community/idia.svg"
                        alt="Idea"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  )}
                  {data?.is_funding_required && (
                    <div className="relative w-[27px] h-[27px]">
                      <Image
                        src="/assets/community/handsake.svg"
                        alt="Funding"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  )}
                </div>
              ) : null}
            </h2>

            <div className="line-clamp-6 text-[#535151] text-lg">
              {renderTextWithHashtags(
                selectedLanguage === "ar"
                  ? data?.idea_text_ar
                  : data?.idea_text_en,
                handleTagClick
              )}
            </div>
          </div>

          <div className="flex gap-4 smallscreen:gap-2 items-center">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePostLike(localPostData?.id);
              }}
              disabled={likePostMutation.isPending}
              className={`flex items-center gap-[9px] text-gray-600 border rounded-3xl 2xl:px-5 px-3 xsmall:px-3 h-[36px] text-center justify-center ${
                state === 1
                  ? "border-primary-5 bg-[#170A510F]/5"
                  : "border-[#FC9555] bg-[#FFB48533]"
              }`}
            >
              <div className="relative w-5 h-5 flex-shrink-0">
                <Image
                  src={
                    state === 1
                      ? "/assets/community/purplethumb.svg"
                      : "/assets/community/orangethumb.svg"
                  }
                  alt="Thumb"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <span
                className={`text-sm font-normal ${
                  state === 1 ? "text-primary-5" : "text-[#FC9555]"
                }`}
              >
                {localPostData?.likes_count}
              </span>
            </button>

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!authToken) {
                  toast.info(t("COMMON.LOGIN_TO_REPLY"));
                  return;
                }
                setOpenReplyForm(true);
              }}
              className={`flex items-center gap-[9px] text-gray-600 border rounded-3xl 2xl:px-5 px-3 xsmall:px-3 h-[36px] text-center justify-center ${
                state === 1
                  ? "border-primary-5 bg-[#170A510F]/5"
                  : "border-[#FC9555] bg-[#FFB48533]"
              }`}
            >
              <div className="relative w-5 h-5 flex-shrink-0">
                <Image
                  src={
                    state === 1
                      ? "/assets/community/message.svg"
                      : "/assets/community/orangemsgicn.svg"
                  }
                  alt="Message"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <span
                className={`text-sm font-normal ${
                  state === 1 ? "text-primary-5" : "text-[#FC9555]"
                }`}
              >
                {data?.replies_count}
              </span>
            </button>

            {data?.proposing_idea && (
              <button
                type="button"
                className={`flex gap-2 smallscreen:gap-[4px] smallscreen:text-xs cursor-pointer text-sm font-bold items-center ${
                  state === 1 ? "text-primary-5" : "text-[#FC9555]"
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!authToken) {
                    toast.info(t("COMMON.LOGIN_TO_CONTACT"));
                    return;
                  }
                  setOpen(true);
                }}
              >
                <div className="relative w-[18px] h-[18px]">
                  <Image
                    src={
                      state === 1
                        ? "/assets/community/contactus.svg"
                        : "/assets/community/orangecontact_icn.svg"
                    }
                    alt=""
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
                {t("COMMON.CONTACT_US")}
              </button>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

export default InnerPost;
