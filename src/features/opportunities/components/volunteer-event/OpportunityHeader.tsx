"use client";

import { useTranslation } from "react-i18next";
import Title from "@/components/shared/Title";
import { Button } from "@/components/ui/Button";
import CreatorActionBar from "./CreatorActionBar";
import type { VolunteerOpportunityDetail } from "./types";
import { opportunityTitle, type VolunteerEventView } from "./volunteerEventView";

interface OpportunityHeaderProps {
  data: VolunteerOpportunityDetail;
  view: VolunteerEventView;
  onRegisterClick: () => void;
  onChanged: () => void;
}

/**
 * Title, the viewer's Register / Unregister, and the creator's icon row.
 *
 * The creator's own primary action (Edit / Repost) lives in the icon row as a
 * glyph. Everyone else keeps a labelled button, because for them this is the
 * page's main call to action — the one control a volunteer must not have to
 * hover to identify. It is desktop-only here; `ViewerActionButton` renders the
 * phone copy further down the page.
 */
export default function OpportunityHeader({
  data,
  view,
  onRegisterClick,
  onChanged,
}: OpportunityHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex justify-between items-start">
      <h2 className="lg:w-[75%] md:w-[75%] pb-5 mediumscreen1:w-[70%] xsl:w-[80%] xss:w-full">
        <Title
          text={opportunityTitle(data)}
          variant="default"
          hasMargin={false}
          className="2xl:leading-[50px] lg:leading-[40px] md:leading-[42px] mediumscreen1:leading-[44px] mobilescreen:leading-[32px] text-start"
        />
      </h2>

      <div className="flex flex-col items-end gap-3">
        <ViewerActionButton
          view={view}
          onClick={onRegisterClick}
          className="whitespace-nowrap block xss:hidden disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {/* The creator reads the closed state off the accented padlock; a
            viewer has no padlock, so they keep the labelled pill. */}
        {view.closedByCreator && !view.isCreator && (
          <span className="whitespace-nowrap rounded-[20px] bg-[#F1F1F5] px-4 py-2 text-sm font-bold text-secondary-102">
            {t("COMMON.REGISTRATION_CLOSED")}
          </span>
        )}

        <CreatorActionBar
          opportunityId={String(data.id)}
          view={view}
          onChanged={onChanged}
        />
      </div>
    </div>
  );
}

/**
 * The labelled Register / Unregister button. Renders for viewers only — the
 * creator's equivalent is the glyph in `CreatorActionBar`, so showing this too
 * would put the same action on the page twice.
 */
export function ViewerActionButton({
  view,
  onClick,
  className,
}: {
  view: Pick<
    VolunteerEventView,
    "showActionButton" | "isCreator" | "isViewerActionDisabled" | "actionLabelKey"
  >;
  onClick: () => void;
  className: string;
}) {
  const { t } = useTranslation();
  if (!view.showActionButton || view.isCreator) return null;

  return (
    <Button
      variant="primary"
      size="medium"
      className={className}
      disabled={view.isViewerActionDisabled}
      onClick={onClick}
    >
      {t(view.actionLabelKey)}
    </Button>
  );
}
