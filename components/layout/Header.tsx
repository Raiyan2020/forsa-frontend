"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import { useNotificationStore } from "@/store/notificationStore";
import LanguageSelection from "@/components/shared/LanguageSelection";

// Inline SVGs instead of react-icons — avoids icon library chunks in the layout bundle
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  );
}
function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
    </svg>
  );
}
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
    </svg>
  );
}

const Header = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const language = useLanguageStore((s) => s.language);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const isLoggedIn = !!user;
  const isVolunteer =
    isLoggedIn &&
    (user?.user_type === "individual" || user?.user_type === "volunteer");
  const isOrganizer = isLoggedIn && user?.user_type === "organization";

  const profilePicUrl =
    user?.profile_pic || "/assets/auth/profileimg.svg";

  const handleLogout = () => {
    logout();
    router.push("/");
    setMenuOpen(false);
    setDropdownOpen(null);
  };

  useEffect(() => {
    if (menuOpen) {
      document.body.classList.add("body-no-scroll");
    } else {
      document.body.classList.remove("body-no-scroll");
    }
    return () => {
      document.body.classList.remove("body-no-scroll");
    };
  }, [menuOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
    setDropdownOpen(null);
  }, [pathname]);

  const close = () => {
    setMenuOpen(false);
    setDropdownOpen(null);
  };

  const NotificationBadge = ({ mobile = false }: { mobile?: boolean }) => (
    <Link href="/notification" onClick={close} aria-label={t("COMMON.NOTIFICATIONS") || "Notifications"}>
      <div className="relative">
        <Image
          src="/assets/homepage/notification.svg"
          alt=""
          width={mobile ? 35 : 40}
          height={mobile ? 35 : 40}
          className={mobile ? "xss:w-[35px] xss:h-[35px]" : ""}
          aria-hidden="true"
          unoptimized
        />
        {unreadCount > 0 && (
          <span
            className={`absolute top-[14px] left-[10px] p-2 transform translate-x-1/2 -translate-y-1/2 bg-orange-500 text-white text-[10px] leading-[1rem] font-bold ${unreadCount > 99 ? "w-5 h-3" : "w-3 h-3"
              } flex items-center justify-center rounded-full`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </div>
    </Link>
  );

  const ProfileDropdown = ({
    isVolunteerUser,
  }: {
    isVolunteerUser: boolean;
  }) => (
    <li className="flex text-primary-5 relative">
      <span className="text-primary-5 2xl:text-lg lg:text-base sm:text-base flex gap-3 items-center">
        <Link
          href={isVolunteerUser ? "/volunteer-profile" : "/entities-profile"}
          onClick={close}
          aria-label={t("COMMON.VOLUNTEER.PROFILE") || "Profile"}
        >
          <Image
            src={profilePicUrl}
            alt=""
            width={48}
            height={48}
            className="w-12 h-12 object-cover rounded-full border border-primary-5"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/assets/auth/profileimg.svg";
            }}
          />
        </Link>
        <button
          className="cursor-pointer focus:outline-none"
          aria-label={t("COMMON.TOGGLE_PROFILE_MENU") || "Toggle profile menu"}
          aria-expanded={dropdownOpen === "profile"}
          onClick={() =>
            setDropdownOpen(dropdownOpen === "profile" ? null : "profile")
          }
        >
          {dropdownOpen === "profile" ? (
            <ChevronUpIcon className="text-primary-5 font-bold text-[30px]" aria-hidden="true" />
          ) : (
            <ChevronDownIcon className="text-primary-5 font-bold text-[30px]" aria-hidden="true" />
          )}
        </button>
      </span>
      {dropdownOpen === "profile" && (
        <ul className="absolute cursor-pointer right-0 rtl:left-0 rtl:right-auto mt-2 bg-white shadow-[0px_4px_8px_3px_#00000026] rounded-[15px] py-2 top-[75px] laptop:top-[58px] lg:top-[60px] w-[245px] rtl:w-[260px] dropdown-menu z-50">
          {isVolunteerUser ? (
            <>
              <DropdownItem
                href="/account-information"
                icon="/assets/auth/accountsetting.svg"
                label={t("COMMON.ACCOUNT.SETTINGS")}
              />
              <DropdownItem
                href="/volunteer-profile"
                icon="/assets/auth/volunteerprofile.svg"
                label={t("COMMON.VOLUNTEER.PROFILE")}
              />
              <DropdownItem
                href="/volunteer-qr-code"
                icon="/assets/auth/qrcode.svg"
                label={t("COMMON.QRCODE")}
              />
              <DropdownItem
                href="/calendar"
                icon="/assets/auth/mycalander.svg"
                label={t("COMMON.MY.CALENDAR")}
              />
              <DropdownItem
                href="/achievement-reports"
                icon="/assets/auth/file-text.svg"
                label={t("COMMON.REPORT")}
              />
            </>
          ) : (
            <>
              <DropdownItem
                href="/account-information"
                icon="/assets/auth/accountsetting.svg"
                label={t("COMMON.ACCOUNT.SETTINGS")}
              />
              <DropdownItem
                href="/entities-profile"
                icon="/assets/auth/volunteerprofile.svg"
                label={t("COMMON.ORGANIZATION.PROFILE")}
              />
              <DropdownItem
                href="/calendar"
                icon="/assets/auth/mycalander.svg"
                label={t("COMMON.MY.CALENDAR")}
              />
            </>
          )}
          <li
            className="px-4 py-2 hover:bg-[#F5F5F5] mx-2 rounded-xl flex items-center gap-3 h-12 text-lg font-bold text-secondary-101 cursor-pointer"
            onClick={handleLogout}
          >
            <Image
              src="/assets/auth/logout.svg"
              alt=""
              width={24}
              height={24}
              className="w-6 h-6 object-contain"
              unoptimized
            />
            {t("COMMON.LOGOUT")}
          </li>
        </ul>
      )}
    </li>
  );

  const DropdownItem = ({
    href,
    icon,
    label,
  }: {
    href: string;
    icon: string;
    label: string;
  }) => (
    <li className="px-4 py-2 hover:bg-[#F5F5F5] mx-2 rounded-xl flex items-center gap-3 h-12 text-lg font-bold text-secondary-101">
      <Link href={href} className="flex items-center gap-3 w-full" onClick={close}>
        <Image src={icon} alt="" width={24} height={24} className="w-6 h-6 object-contain" unoptimized />
        {label}
      </Link>
    </li>
  );

  return (
    <nav
      className="bg-white w-full z50 sticky top-0"
      onMouseLeave={() => setDropdownOpen(null)}
    >
      <div className="2xl:w-[83%] laptopmain:w-[88%] laptop:w-[87%] lg:w-[90%] laptopitm:w-[90%] w-[90%] container-fluid mx-auto flex justify-between items-center 2xl:py-10 2xl:pb-[30px] laptop:py-5 laptopmain:py-4 lg:py-5 py-5 mobilescreen:py-3 mobilescreen:pb-1">
        {/* Logo */}
        <div>
          <Link href="/" onClick={close}>
            <Image
              src="/assets/auth/logo.svg"
              alt="Fursa"
              width={148}
              height={69}
              className="2xl:w-[148px] laptopmain:w-[100px] h-[69px] mobilescreen:h-[44px] mediumscreen1:w-[100px] laptop:w-[100px] lg:w-[100px] extrasmall:!w-[80px] mobilescreen:w-[100px]"
              preload={true}
              loading="eager"
              unoptimized
            />
          </Link>
        </div>

        {/* Desktop Menu */}
        <ul className="hidden mediumscreen:flex 2xl:gap-[30px] lg:gap-5 md:gap-4 mediumscreen1:gap-2 items-center laptopitm:gap-[13px]">
          <li
            className={`flex text-primary-5 2xl:text-lg lg:text-base sm:text-base items-center laptopitm:text-sm ${pathname === "/" ? "font-bold" : ""
              }`}
          >
            <Link href="/" onClick={close}>
              {t("COMMON.HOME")}
            </Link>
          </li>

          {/* Opportunities dropdown */}
          <li className="cursor-pointer flex text-primary-5 relative items-center">
            <Link
              href="/opportunities"
              onClick={close}
              className={`flex text-primary-5 2xl:text-lg lg:text-base sm:text-base items-center laptopitm:text-sm ${pathname === "/opportunities" ||
                pathname === "/volunteer-opportunities-list" ||
                pathname === "/learn-and-share-list"
                ? "font-bold"
                : ""
                }`}
            >
              {t("COMMON.OPPORTUNITIES")}
            </Link>
            <button
              className="flex items-center ml-1 cursor-pointer focus:outline-none"
              aria-label={t("COMMON.TOGGLE_OPPORTUNITIES_MENU") || "Toggle opportunities menu"}
              aria-expanded={dropdownOpen === "opportunities"}
              onClick={() =>
                setDropdownOpen(
                  dropdownOpen === "opportunities" ? null : "opportunities"
                )
              }
            >
              {dropdownOpen === "opportunities" ? (
                <ChevronUpIcon className="text-primary-5 font-bold text-[30px]" aria-hidden="true" />
              ) : (
                <ChevronDownIcon className="text-primary-5 font-bold text-[30px]" aria-hidden="true" />
              )}
            </button>
            {dropdownOpen === "opportunities" && (
              <div className="absolute left-0 mt-2 w-[182px] rtl:w-[225px] bg-white shadow-[0px_4px_8px_3px_#00000026] rounded-[15px] py-2 top-[36px] z-50">
                <ul>
                  <li className="px-4 py-2 hover:bg-[#F5F5F5] mx-2 rounded-xl flex items-center gap-2 h-12 text-lg font-bold text-secondary-101">
                    <Link href="/volunteer-opportunities-list" className="w-full" onClick={close}>
                      {t("COMMON.VOLUNTEER")}
                    </Link>
                  </li>
                  <li className="px-4 py-2 hover:bg-[#F5F5F5] mx-2 rounded-xl flex items-center gap-2 h-12 text-lg font-bold text-secondary-101">
                    <Link href="/learn-and-share-list" className="w-full" onClick={close}>
                      {t("COMMON.LEARN_SHARE")}
                    </Link>
                  </li>
                </ul>
              </div>
            )}
          </li>

          <li
            className={`flex text-primary-5 2xl:text-lg lg:text-base laptopitm:text-sm sm:text-base items-center ${pathname === "/events-and-activities" ||
              pathname === "/event-exhibition-list" ||
              pathname === "/event-sports-list" ||
              pathname === "/event-camps-list"
              ? "font-bold"
              : ""
              }`}
          >
            <Link href="/events-and-activities" onClick={close}>
              {t("COMMON.EVENTS_ACTIVITIES")}
            </Link>
          </li>

          <li
            className={`flex text-primary-5 2xl:text-lg lg:text-base laptopitm:text-sm sm:text-base items-center ${pathname === "/achievements" ? "font-bold" : ""
              }`}
          >
            <Link href="/achievements" onClick={close}>
              {t("COMMON.ACHIEVEMENTS")}
            </Link>
          </li>

          <li
            className={`flex text-primary-5 2xl:text-lg laptopitm:text-sm lg:text-base sm:text-base items-center ${pathname === "/community" ? "font-bold" : ""
              }`}
          >
            <Link href="/community" onClick={close}>
              {t("COMMON.FORSA.COMMUNITY-")}
            </Link>
          </li>

          {/* More dropdown */}
          <li
            className={`cursor-pointer flex text-primary-5 2xl:text-lg laptopitm:text-sm lg:text-base sm:text-base relative ${["/more-profile", "/partner", "/about-us", "/contact-us", "/faq"].includes(pathname)
              ? "font-bold"
              : ""
              }`}
          >
            <button
              className="text-primary-5 2xl:text-lg laptopitm:text-sm lg:text-base sm:text-base flex gap-1 items-center focus:outline-none"
              aria-label={t("COMMON.TOGGLE_MORE_MENU") || "Toggle more menu"}
              aria-expanded={dropdownOpen === "more"}
              onClick={() => setDropdownOpen(dropdownOpen === "more" ? null : "more")}
            >
              {t("COMMON.MORE")}
              {dropdownOpen === "more" ? (
                <ChevronUpIcon className="text-primary-5 font-bold text-[30px]" aria-hidden="true" />
              ) : (
                <ChevronDownIcon className="text-primary-5 font-bold text-[30px]" aria-hidden="true" />
              )}
            </button>
            {dropdownOpen === "more" && (
              <ul className="absolute left-0 mt-2 bg-white shadow-[0px_4px_8px_3px_#00000026] rounded-[15px] py-2 top-[36px] w-[190px] rtl:w-[235px] z-50">
                <li className="px-4 py-2 hover:bg-[#F5F5F5] mx-2 rounded-xl flex items-center gap-3 h-12 text-lg font-bold text-secondary-101">
                  <Link href="/more-profile" className="flex items-center gap-3 w-full" onClick={close}>
                    <Image src="/assets/auth/profileimg.svg" alt="" width={24} height={24} className="w-6 h-6 object-contain" unoptimized />
                    {t("COMMON.PROFILES")}
                  </Link>
                </li>
                <li className="px-4 py-2 hover:bg-[#F5F5F5] mx-2 rounded-xl flex items-center gap-3 h-12 text-lg font-bold text-secondary-101">
                  <Link href="/partner" className="flex items-center gap-3 w-full" onClick={close}>
                    <Image src="/assets/auth/partners.svg" alt="" width={24} height={24} className="w-6 h-6 object-contain" unoptimized />
                    {t("COMMON.PARTNERS")}
                  </Link>
                </li>
                <li className="px-4 py-2 hover:bg-[#F5F5F5] mx-2 rounded-xl flex items-center gap-3 h-12 text-lg font-bold text-secondary-101">
                  <Link href="/about-us" className="flex items-center gap-3 w-full" onClick={close}>
                    <Image src="/assets/auth/aboutus.svg" alt="" width={24} height={24} className="w-6 h-6 object-contain" unoptimized />
                    {t("COMMON.ABOUT_US")}
                  </Link>
                </li>
                <li className="px-4 py-2 hover:bg-[#F5F5F5] mx-2 rounded-xl flex items-center gap-3 h-12 text-lg font-bold text-secondary-101">
                  <Link href="/contact-us" className="flex items-center gap-3 w-full" onClick={close}>
                    <Image src="/assets/auth/contactus.svg" alt="" width={24} height={24} className="w-6 h-6 object-contain" unoptimized />
                    {t("COMMON.CONTACT_US")}
                  </Link>
                </li>
              </ul>
            )}
          </li>
        </ul>

        {/* Desktop Buttons */}
        <div className={`hidden mediumscreen:flex items-center ${language === "ar" ? "gap-4" : "space-x-4"}`}>
          {(isVolunteer || isOrganizer) && <NotificationBadge />}
          <LanguageSelection />
          {!isLoggedIn ? (
            <Link href="/login" className="h-[50px] mediumscreen3:h-[34px] cursor-pointer flex" onClick={close}>
              <button className="bg-primary-5 h-full text-white px-6 rounded-xl text-base font-semibold hover:opacity-90 transition-opacity">
                {t("COMMON.SIGN_IN")}
              </button>
            </Link>
          ) : (
            <ProfileDropdown isVolunteerUser={isVolunteer} />
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="mediumscreen:hidden flex gap-5 items-center">
          {(isVolunteer || isOrganizer) && <NotificationBadge mobile />}
          <LanguageSelection />
          <button
            onClick={() => { setMenuOpen(!menuOpen); setDropdownOpen(null); }}
            aria-label={menuOpen ? t("COMMON.CLOSE_MENU") || "Close menu" : t("COMMON.OPEN_MENU") || "Open menu"}
            aria-expanded={menuOpen}
            className="focus:outline-none"
          >
            {menuOpen ? (
              <CloseIcon className="text-primary-5 font-bold text-[30px]" aria-hidden="true" />
            ) : (
              <Image src="/assets/auth/lucide-menu.svg" alt="" width={32} height={32} className="w-8 xss:w-[36px]" aria-hidden="true" unoptimized />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <ul className="mediumscreen:hidden bg-white shadow-md mobile-menu">
          {[
            { href: "/", label: t("COMMON.HOME") },
            { href: "/events-and-activities", label: t("COMMON.EVENTS_ACTIVITIES") },
            { href: "/achievements", label: t("COMMON.ACHIEVEMENTS") },
            { href: "/community", label: t("COMMON.FORSA.COMMUNITY-") },
          ].map(({ href, label }) => (
            <li key={href} className={`border-b text-primary-5 text-sm ${pathname === href ? "font-bold" : ""}`}>
              <Link href={href} className="px-4 py-3 block w-full" onClick={close}>
                {label}
              </Link>
            </li>
          ))}

          {/* Opportunities sub-menu */}
          <li className="border-b text-primary-5 text-sm">
            <div className="px-4 py-3 flex justify-between items-center">
              <Link href="/opportunities" onClick={close} className="flex-1">
                {t("COMMON.OPPORTUNITIES")}
              </Link>
              <button
                aria-label={t("COMMON.TOGGLE_OPPORTUNITIES_MENU") || "Toggle opportunities menu"}
                aria-expanded={dropdownOpen === "opportunities"}
                onClick={() => setDropdownOpen(dropdownOpen === "opportunities" ? null : "opportunities")}
                className="focus:outline-none"
              >
                {dropdownOpen === "opportunities" ? (
                  <ChevronUpIcon className="text-primary-5 font-bold text-[20px]" aria-hidden="true" />
                ) : (
                  <ChevronDownIcon className="text-primary-5 font-bold text-[20px]" aria-hidden="true" />
                )}
              </button>
            </div>
          </li>
          {dropdownOpen === "opportunities" && (
            <ul className="bg-gray-100">
              <li className="border border-b-primary-5/40 text-primary-5">
                <Link href="/volunteer-opportunities-list" className="w-full block text-sm pl-5 py-2 pr-6" onClick={close}>{t("COMMON.VOLUNTEER")}</Link>
              </li>
              <li className="border border-b-primary-5/40 text-primary-5">
                <Link href="/learn-and-share-list" className="w-full block text-sm pl-5 py-2 pr-6" onClick={close}>{t("COMMON.LEARN_SHARE")}</Link>
              </li>
            </ul>
          )}

          {/* More sub-menu */}
          <li className="border-b text-primary-5 text-sm">
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="flex-1">{t("COMMON.MORE")}</span>
              <button
                aria-label={t("COMMON.TOGGLE_MORE_MENU") || "Toggle more menu"}
                aria-expanded={dropdownOpen === "more"}
                onClick={() => setDropdownOpen(dropdownOpen === "more" ? null : "more")}
                className="focus:outline-none"
              >
                {dropdownOpen === "more" ? (
                  <ChevronUpIcon className="text-primary-5 font-bold text-[20px]" aria-hidden="true" />
                ) : (
                  <ChevronDownIcon className="text-primary-5 font-bold text-[20px]" aria-hidden="true" />
                )}
              </button>
            </div>
          </li>
          {dropdownOpen === "more" && (
            <ul className="bg-gray-100">
              {[
                { href: "/more-profile", label: t("COMMON.PROFILES") },
                { href: "/partner", label: t("COMMON.PARTNERS") },
                { href: "/about-us", label: t("COMMON.ABOUT_US") },
                { href: "/contact-us", label: t("COMMON.CONTACT_US") },
              ].map(({ href, label }) => (
                <li key={href} className="border border-b-primary-5/40 text-primary-5">
                  <Link href={href} className="w-full block text-sm pl-4 py-2 pr-6" onClick={close}>{label}</Link>
                </li>
              ))}
            </ul>
          )}

          {/* Auth / Profile in mobile */}
          {!isLoggedIn ? (
            <li className="px-4 py-3 border-b">
              <Link href="/login" onClick={close} className="block w-full">
                <span className="w-full block text-center bg-primary-5 text-white py-2 rounded-xl text-sm font-semibold">
                  {t("COMMON.SIGN_IN")}
                </span>
              </Link>
            </li>
          ) : (
            <>
              <li className="border-b text-primary-5 text-sm">
                <Link href={isVolunteer ? "/volunteer-profile" : "/entities-profile"} onClick={close} className="px-4 py-3 block w-full">
                  {t("COMMON.VOLUNTEER.PROFILE")}
                </Link>
              </li>
              <li className="border-b text-primary-5 text-sm">
                <Link href="/account-information" onClick={close} className="px-4 py-3 block w-full">
                  {t("COMMON.ACCOUNT.SETTINGS")}
                </Link>
              </li>
              <li className="border-b text-primary-5 text-sm">
                <button className="px-4 py-3 block w-full text-start text-primary-5" onClick={handleLogout}>
                  {t("COMMON.LOGOUT")}
                </button>
              </li>
            </>
          )}
        </ul>
      )}
    </nav>
  );
};

export default Header;

