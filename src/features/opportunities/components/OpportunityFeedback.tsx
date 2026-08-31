"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import { Modal } from "@/components/ui/Modal";
import { createOpportunityFeedback, deleteOpportunityFeedback, getOpportunityFeedbacks, updateOpportunityFeedback } from "@/features/opportunities/services/feedbacks";
import { getDefaultProfileImage } from "@/lib/helpers";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";

interface Feedback {
  id: number;
  rating: number;
  comment_en?: string;
  comment_ar?: string;
  user_feedback?: boolean;
  user: {
    id: number;
    full_name?: string;
    nickname?: string;
    profile_pic?: string | null;
    gender_display?: { value_en?: string; value_ar?: string };
  };
}

interface FeedbackDraft {
  id?: number;
  rating: number;
  comment: string;
}

const emptyDraft: FeedbackDraft = { rating: 0, comment: "" };

function Stars({
  value,
  onChange,
}: {
  value: number;
  onChange?: (value: number) => void;
}) {
  return (
    <div className="flex gap-1" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(star)}
          className={onChange ? "cursor-pointer" : "cursor-default"}
          aria-label={`Rate ${star} out of 5`}
        >
          <Star
            className={`h-6 w-6 ${
              star <= value ? "fill-[#F9B233] text-[#F9B233]" : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

/**
 * Reviews for a learn & serve opportunity. Only attendees who haven't reviewed
 * yet get the "share your review" affordance; everyone can read.
 */
export default function OpportunityFeedback({
  opportunityId,
  isAttended,
}: {
  opportunityId: string | number;
  isAttended: boolean;
}) {
  const { t } = useTranslation();
  const language = useLanguageStore((s) => s.language);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [showAll, setShowAll] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [draft, setDraft] = useState<FeedbackDraft>(emptyDraft);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const feedbackQuery = useQuery({
    queryKey: ["opportunity-feedback", String(opportunityId)],
    queryFn: () => getOpportunityFeedbacks(String(opportunityId)),
    enabled: Boolean(opportunityId),
  });

  // Some deployments return the list flat, others nested under `data`.
  const feedbacks: Feedback[] = Array.isArray(feedbackQuery.data)
    ? feedbackQuery.data
    : Array.isArray(feedbackQuery.data?.data)
      ? feedbackQuery.data.data
      : [];

  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: ["opportunity-feedback", String(opportunityId)],
    });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!draft.rating || !draft.comment.trim()) {
        throw new Error("validation");
      }

      const localizedComment = {
        [`comment_${language}`]: draft.comment.trim(),
        rating: draft.rating,
      };

      if (draft.id) {
        return updateOpportunityFeedback({
          feedback_id: String(draft.id),
          data: localizedComment,
        });
      }

      return createOpportunityFeedback({
        ...localizedComment,
        learn_serve_opportunity: opportunityId,
        primary_language: language,
      });
    },
    onSuccess: () => {
      toast.success(
        t(
          draft.id
            ? "COMMON.TOAST.FEEDBACK_UPDATED"
            : "COMMON.TOAST.CREATE_FEEDBACK_SUCCESS"
        )
      );
      setReviewOpen(false);
      setDraft(emptyDraft);
      refresh();
    },
    onError: (error) => {
      if (error instanceof Error && error.message === "validation") {
        toast.error(t("COMMON.REQUIRED.FIELD"));
        return;
      }
      toast.error(
        t(
          draft.id
            ? "COMMON.TOAST.UPDATE_FAILED"
            : "COMMON.TOAST.CREATE_FEEDBACK_FAILED"
        )
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteOpportunityFeedback(String(deleteId)),
    onSuccess: () => {
      toast.success(t("COMMON.TOAST.FEEDBACK_DELETED"));
      setDeleteId(null);
      refresh();
    },
    onError: () => toast.error(t("COMMON.TOAST.DELETE_FAILED")),
  });

  if (feedbackQuery.isLoading) {
    return <Loader inline />;
  }

  const visibleFeedbacks = showAll ? feedbacks : feedbacks.slice(0, 2);
  const hasOwnFeedback = feedbacks.some((feedback) => feedback.user_feedback);

  return (
    <section className="border-t border-[#00000033]/20 mobilescreen:w-[90%] mobilescreen:mx-auto">
      <Modal
        open={reviewOpen}
        onClose={() => {
          setReviewOpen(false);
          setDraft(emptyDraft);
        }}
        title={draft.id ? t("COMMON.EDIT_FEEDBACK") : t("COMMON.REVIEW")}
        size="md"
        footer={
          <div className="flex xss:flex-col justify-center w-full gap-5">
            <Button
              size="medium"
              className="xss:!w-full"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {draft.id ? t("COMMON.SAVE") : t("COMMON.SUBMIT")}
            </Button>
            <Button
              variant="secondary"
              size="medium"
              className="xss:!w-full"
              disabled={saveMutation.isPending}
              onClick={() => {
                setReviewOpen(false);
                setDraft(emptyDraft);
              }}
            >
              {t("COMMON.CANCEL")}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="flex justify-center">
            <Stars
              value={draft.rating}
              onChange={(rating) =>
                setDraft((current) => ({ ...current, rating }))
              }
            />
          </div>
          <textarea
            value={draft.comment}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                comment: event.target.value,
              }))
            }
            placeholder={t("COMMON.SHARE.YOUR.EXPERIENCE")}
            className="min-h-32 w-full rounded-2xl border bg-[#29246D]/[0.03] p-4 outline-none focus:border-primary-5"
          />
        </div>
      </Modal>

      <Modal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title={t("COMMON.DELETE_FEEDBACK")}
        size="sm"
      >
        <h2 className="text-center pb-10 text-lg">
          {t("COMMON.ARE_YOU_SURE_DELETE_FEEDBACK")}
        </h2>
        <div className="flex xss:flex-col justify-center w-full gap-5">
          <Button
            size="medium"
            className="xss:!w-full"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            {t("COMMON.CONFIRM")}
          </Button>
          <Button
            variant="secondary"
            size="medium"
            className="xss:!w-full"
            disabled={deleteMutation.isPending}
            onClick={() => setDeleteId(null)}
          >
            {t("COMMON.CANCEL")}
          </Button>
        </div>
      </Modal>

      {isAttended && !hasOwnFeedback && (
        <div className="flex items-center justify-center gap-4 mb-5">
          <button
            type="button"
            onClick={() => {
              setDraft(emptyDraft);
              setReviewOpen(true);
            }}
            className="mt-[25px] mobilescreen:mt-[30px] flex items-center text-primary-200 font-medium"
          >
            <span className="mr-1 flex gap-2 text-primary-5 items-center 2xl:text-xl lg:text-base text-base font-bold">
              <img
                src="/assets/opportunities/review_thumbsup.svg"
                alt=""
                className="w-6 h-6"
              />
              <p className="2xl:h-5 lg:h-5 md:h-[14px] h-[14px]">
                {t("COMMON.SHARE_YOUR_REVIEW")}
              </p>
            </span>
          </button>
        </div>
      )}

      {feedbacks.length > 2 && (
        <div className="flex justify-end pt-5">
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className="text-secondary-102 2xl:text-xl lg:text-base text-sm font-bold flex items-center gap-1 xsmall:text-xs"
          >
            {t("COMMON.VIEW")} {t(showAll ? "COMMON.LESS" : "COMMON.MORE")}
          </button>
        </div>
      )}

      {feedbacks.length === 0 ? (
        <div className="text-center py-8 text-secondary-102 text-lg font-medium">
          {t("COMMON.NO_REVIEW")}
        </div>
      ) : (
        visibleFeedbacks.map((feedback, index) => (
          <article
            key={feedback.id}
            className={`${index !== 0 ? "border-t border-[#00000033]/20" : ""} pb-5 relative`}
          >
            <div className="flex items-center gap-3 mb-5 mt-[25px] relative">
              <img
                src={
                  feedback.user.profile_pic ||
                  getDefaultProfileImage(
                    feedback.user.gender_display?.value_en,
                    "/assets/profile/male_profile.svg",
                    "/assets/profile/female_profile.svg",
                    "/assets/profile/org_profile.svg"
                  )
                }
                alt={feedback.user.nickname || feedback.user.full_name || ""}
                className="h-[59px] w-[59px] rounded-full border-2 border-primary-5 object-cover"
              />
              <div>
                <h3 className="font-bold text-xl xs:text-base">
                  {feedback.user.nickname || feedback.user.full_name}
                </h3>
                <Stars value={feedback.rating} />
              </div>

              {user?.id === feedback.user.id && (
                <div
                  className={`absolute top-0 ${language === "ar" ? "left-0" : "right-0"} z-10`}
                >
                  <button
                    type="button"
                    className="p-2 rounded-full hover:bg-gray-100"
                    onClick={() =>
                      setOpenMenuId((current) =>
                        current === feedback.id ? null : feedback.id
                      )
                    }
                    aria-label="Feedback actions"
                  >
                    <MoreHorizontal className="text-lg text-primary-5" />
                  </button>
                  {openMenuId === feedback.id && (
                    <div
                      className={`absolute top-full mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-20 ${
                        language === "ar" ? "left-0" : "right-0"
                      }`}
                    >
                      <button
                        type="button"
                        className="flex items-center gap-2 w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-t-lg"
                        onClick={() => {
                          setDraft({
                            id: feedback.id,
                            rating: feedback.rating,
                            comment:
                              (language === "ar"
                                ? feedback.comment_ar
                                : feedback.comment_en) || "",
                          });
                          setReviewOpen(true);
                          setOpenMenuId(null);
                        }}
                      >
                        <Pencil className="h-4 w-4 text-primary-5" />
                        <span className="text-sm">{t("COMMON.EDIT_TEXT")}</span>
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-2 w-full px-4 py-2 text-left text-red-600 hover:bg-gray-50 rounded-b-lg"
                        onClick={() => {
                          setDeleteId(feedback.id);
                          setOpenMenuId(null);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                        <span className="text-sm">{t("COMMON.DELETE")}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mb-4">
              <p className="text-secondary-100 text-lg xs:text-xs xs:leading-[24px]">
                {(language === "ar"
                  ? feedback.comment_ar
                  : feedback.comment_en) || ""}
              </p>
            </div>
          </article>
        ))
      )}
    </section>
  );
}
