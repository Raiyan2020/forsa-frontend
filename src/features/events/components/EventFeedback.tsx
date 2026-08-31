"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import Loader from "@/components/ui/Loader";
import {
  createEventFeedback,
  deleteEventFeedback,
  getEventFeedbacks,
  updateEventFeedback,
} from "@/features/services/api";
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
              star <= value
                ? "fill-[#F9B233] text-[#F9B233]"
                : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function EventFeedback({ eventId }: { eventId: string }) {
  const { t } = useTranslation();
  const language = useLanguageStore((state) => state.language);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [showAll, setShowAll] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [draft, setDraft] = useState<FeedbackDraft>(emptyDraft);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const feedbackQuery = useQuery({
    queryKey: ["event-feedback", eventId],
    queryFn: () => getEventFeedbacks(eventId),
    enabled: Boolean(eventId),
  });

  const feedbacks: Feedback[] = Array.isArray(feedbackQuery.data?.data)
    ? feedbackQuery.data.data
    : [];

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["event-feedback", eventId] });

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
        return updateEventFeedback({
          feedback_id: String(draft.id),
          data: localizedComment,
        });
      }

      return createEventFeedback({
        ...localizedComment,
        event: eventId,
        primary_language: language,
      });
    },
    onSuccess: () => {
      toast.success(
        t(draft.id ? "COMMON.TOAST.FEEDBACK_UPDATED" : "COMMON.TOAST.CREATE_FEEDBACK_SUCCESS")
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
            ? "COMMON.TOAST.FEEDBACK_UPDATE_FAILED"
            : "COMMON.TOAST.CREATE_FEEDBACK_FAILED"
        )
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteEventFeedback(String(deleteId)),
    onSuccess: () => {
      toast.success(t("COMMON.TOAST.FEEDBACK_DELETED"));
      setDeleteId(null);
      refresh();
    },
    onError: () => toast.error(t("COMMON.TOAST.FEEDBACK_DELETE_FAILED")),
  });

  if (feedbackQuery.isLoading) {
    return <Loader inline />;
  }

  const visibleFeedbacks = showAll ? feedbacks : feedbacks.slice(0, 2);
  const hasOwnFeedback = feedbacks.some(
    (feedback) => feedback.user_feedback || feedback.user.id === user?.id
  );

  return (
    <section className="border-t border-[#00000033]/20 pt-6 mobilescreen:mx-auto mobilescreen:w-[90%]">
      <Modal
        open={reviewOpen}
        onClose={() => {
          setReviewOpen(false);
          setDraft(emptyDraft);
        }}
        title={draft.id ? t("COMMON.EDIT_FEEDBACK") : t("COMMON.REVIEW")}
        size="md"
        footer={
          <div className="mt-6 flex w-full justify-center gap-5 xss:flex-col">
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
              onClick={() => setReviewOpen(false)}
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
              onChange={(rating) => setDraft((current) => ({ ...current, rating }))}
            />
          </div>
          <textarea
            value={draft.comment}
            onChange={(event) =>
              setDraft((current) => ({ ...current, comment: event.target.value }))
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
        <p className="pb-8 text-center text-lg">
          {t("COMMON.ARE_YOU_SURE_DELETE_FEEDBACK")}
        </p>
        <div className="flex justify-center gap-5 xss:flex-col">
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
            onClick={() => setDeleteId(null)}
          >
            {t("COMMON.CANCEL")}
          </Button>
        </div>
      </Modal>

      {!hasOwnFeedback && (
        <div className="mb-5 flex justify-center">
          <button
            type="button"
            className="flex items-center gap-2 font-bold text-primary-5"
            onClick={() => {
              if (!user) {
                toast.info(t("COMMON.LOGIN_TO_GIVE_FEEDBACK"));
                return;
              }
              setDraft(emptyDraft);
              setReviewOpen(true);
            }}
          >
            <img
              src="/assets/opportunities/review_thumbsup.svg"
              alt=""
              className="h-6 w-6"
            />
            {t("COMMON.SHARE_YOUR_REVIEW")}
          </button>
        </div>
      )}

      {feedbacks.length > 2 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className="font-bold text-secondary-102"
          >
            {t("COMMON.VIEW")} {t(showAll ? "COMMON.LESS" : "COMMON.MORE")}
          </button>
        </div>
      )}

      {feedbacks.length === 0 ? (
        <p className="py-8 text-center text-lg font-medium text-secondary-102">
          {t("COMMON.NO_REVIEW")}
        </p>
      ) : (
        visibleFeedbacks.map((feedback, index) => (
          <article
            key={feedback.id}
            className={`relative pb-5 ${index ? "border-t border-[#00000033]/20" : ""}`}
          >
            <div className="mt-6 flex items-center gap-3">
              <img
                src={feedback.user.profile_pic || "/assets/profile/org_profile.svg"}
                alt={feedback.user.nickname || feedback.user.full_name || ""}
                className="h-[59px] w-[59px] rounded-full border-2 border-primary-5 object-cover"
              />
              <div>
                <h3 className="text-xl font-bold">
                  {feedback.user.nickname || feedback.user.full_name}
                </h3>
                <Stars value={feedback.rating} />
              </div>

              {user?.id === feedback.user.id && (
                <div className="absolute end-0 top-6">
                  <button
                    type="button"
                    className="rounded-full p-2 hover:bg-gray-100"
                    onClick={() =>
                      setOpenMenuId((current) =>
                        current === feedback.id ? null : feedback.id
                      )
                    }
                    aria-label="Feedback actions"
                  >
                    <MoreHorizontal className="text-primary-5" />
                  </button>
                  {openMenuId === feedback.id && (
                    <div className="absolute end-0 z-20 w-36 rounded-lg border bg-white shadow-lg">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-50"
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
                        <Pencil className="h-4 w-4" />
                        {t("COMMON.EDIT_TEXT")}
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-4 py-2 text-red-600 hover:bg-gray-50"
                        onClick={() => {
                          setDeleteId(feedback.id);
                          setOpenMenuId(null);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        {t("COMMON.DELETE")}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="mt-5 text-lg text-secondary-100">
              {(language === "ar" ? feedback.comment_ar : feedback.comment_en) || ""}
            </p>
          </article>
        ))
      )}
    </section>
  );
}
