"use client";

import { useState } from "react";
import Searchbar from "@/components/ui/Searchbar";
import { Button } from "@/components/ui/Button";
import Title from "@/components/shared/Title";
import { TiPlus } from "react-icons/ti";
import { Modal } from "@/components/ui/Modal";
import CommunityFilterModal, {
  CommunityFiltersData,
} from "./CommunityFilterModal";
import CreatePostModal from "./CreatePostModal";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/helpers";

interface PostProps {
  refetch: () => void;
  setOpenfilter: React.Dispatch<React.SetStateAction<boolean>>;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  openfilter: boolean;
  onApply: (
    filters: {
      name: string;
      startDate: string;
      endDate: string;
      type: string;
      tags?: string[];
    },
    isClear?: boolean
  ) => void;
  initialValues?: CommunityFiltersData;
  isViewAll?: boolean;
}

function Post({
  refetch,
  setOpenfilter,
  openfilter,
  onApply,
  initialValues,
  setSearchQuery,
  isViewAll = false,
}: PostProps) {
  const { t } = useTranslation();
  const [opencreatepost, setcreatepost] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const user = useAuthStore((s) => s.user);
  const [clearFiltersKey, setClearFiltersKey] = useState(0);
  const [isFilterDirty, setIsFilterDirty] = useState(false);
  const authToken = user?.auth_token;

  return (
    <>
      <Modal
        open={openfilter}
        onClose={() => setOpenfilter(false)}
        title={t("COMMON.FILTER")}
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
              disabled={!isFilterDirty}
            >
              {t("COMMON.APPLY")}
            </Button>{" "}
            <Button
              variant="secondary"
              size="medium"
              className="xss:!w-full"
              onClick={() => {
                onApply(
                  {
                    name: "",
                    startDate: "",
                    endDate: "",
                    type: "",
                    tags: [],
                  },
                  true
                );
                setClearFiltersKey((prev) => prev + 1);
              }}
            >
              {t("COMMON.CLEAR")}
            </Button>{" "}
          </div>
        }
      >
        <CommunityFilterModal
          key={clearFiltersKey}
          onApply={onApply}
          initialValues={initialValues}
          onDirtyChange={setIsFilterDirty}
        />
      </Modal>

      <Modal
        open={opencreatepost}
        onClose={() => setcreatepost(false)}
        title={t("COMMON.CREATE_POST")}
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
              {t("COMMON.SUBMIT")}
            </Button>
            <Button
              variant="secondary"
              size="medium"
              className="xss:!w-full"
              onClick={() => setcreatepost(false)}
              disabled={isSubmitting}
            >
              {t("COMMON.CANCEL")}
            </Button>{" "}
          </div>
        }
      >
        <CreatePostModal
          onLoadingChange={(loading) => setIsSubmitting(loading)}
          afterPostCreation={() => {
            setcreatepost(false);
          }}
          refetch={refetch}
        />
      </Modal>

      <div
        className={cn(
          !isViewAll && "2xl:px-5 px-3",
          "mobilescreen:px-[13px] 2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto relative"
        )}
      >
        <div className="flex miniscreen:flex-col miniscreen:gap-5 miniscreen:items-start justify-between items-center mobilescreen:items-start mobilescreen:flex-col mobilescreen:gap-5 pb-12">
          <div>
            <h1 className="">
              <Title
                text={t("COMMON.POST")}
                variant="default"
                hasMargin={false}
              />
            </h1>
          </div>
          {authToken && (
            <div className="mobilescreen:!w-full">
              <div className="flex mobilescreen:flex-col gap-7 postseacrh items-center">
                <Searchbar
                  onFilterClick={() => setOpenfilter(true)}
                  onSearchChange={(value) => setSearchQuery(value)}
                />

                <Button
                  variant="primary"
                  onClick={() => setcreatepost(true)}
                  className="text-lg w-[200px] mobilescreen:w-[100%] xss:rounded-[20px] h-[60px] 2xl:h-[60px] 2xl:w-[280px] md:w-[290px] rounded-[30px] flex items-center justify-center gap-2"
                >
                  <TiPlus />
                  {t("COMMON.SHARE_YOUR_THOUGHTS")}
                </Button>
              </div>
            </div>
          )}
          {!authToken && (
            <div className="w-1/2 mobilescreen:w-full">
              <div className="flex justify-end">
                <Searchbar
                  onFilterClick={() => setOpenfilter(true)}
                  onSearchChange={(value) => setSearchQuery(value)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Post;
