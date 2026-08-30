"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { FieldProps } from "formik";
import { FaAlignCenter, FaAlignLeft, FaAlignRight } from "react-icons/fa6";
import {
  MdOutlineKeyboardArrowDown,
  MdOutlineKeyboardArrowUp,
} from "react-icons/md";

import { useLanguageStore } from "@/store/languageStore";

const asset = (path: string) => `/assets/description_icons/${path}`;

interface RichTextEditorProps extends FieldProps {
  label: string;
  placeholder?: string;
  /**
   * Forces the editor's writing direction/alignment, overriding the app's
   * current UI language — used when this instance is a dedicated Arabic or
   * English field rather than one that follows the current locale.
   */
  language?: "ar" | "en";
}

/** Toolbar icon button that reflects an active mark. */
function ToolbarButton({
  onClick,
  active,
  src,
  alt,
  size = 24,
}: {
  onClick: () => void;
  active?: boolean;
  src: string;
  alt: string;
  size?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-1 rounded ${
        active ? "bg-gray-300 hover:bg-gray-300" : "hover:bg-gray-200"
      }`}
    >
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        style={{ width: size, height: size }}
      />
    </button>
  );
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  field,
  form,
  label,
  language,
}) => {
  const { name, value } = field;
  const { setFieldValue, setFieldTouched, errors, touched } = form;
  const uiLanguage = useLanguageStore((s) => s.language);
  const selectedLanguage = language ?? uiLanguage;

  const [isFocused, setIsFocused] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [currentColor, setCurrentColor] = useState("#29246D");
  const [isAlignOpen, setIsAlignOpen] = useState(false);
  const [currentAlign, setCurrentAlign] = useState(
    selectedLanguage === "ar" ? "right" : "left"
  );

  const editor = useEditor({
    // Tiptap must not render during SSR or the first client paint mismatches.
    immediatelyRender: false,
    extensions: [
      // Bold, italic, underline, strike, lists and history all ship with
      // StarterKit in Tiptap 3 — registering them again would duplicate names.
      StarterKit.configure({
        bulletList: {
          HTMLAttributes: {
            class: `list-disc ${selectedLanguage === "ar" ? "pr-5" : "pl-5"}`,
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: `list-decimal ${selectedLanguage === "ar" ? "pr-5" : "pl-5"}`,
          },
        },
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        dropcursor: false,
        gapcursor: false,
      }),
      TextAlign.configure({ types: ["paragraph"] }),
      TextStyle,
      Color,
    ],
    editorProps: {
      attributes: {
        dir: selectedLanguage === "ar" ? "rtl" : "ltr",
      },
    },
    content: value || "",
    onUpdate: ({ editor }) => {
      setFieldValue(name, editor.getHTML());
      setHasContent(!editor.isEmpty);
    },
    onFocus: () => setIsFocused(true),
    onBlur: () => {
      setIsFocused(false);
      setFieldTouched(name, true);
    },
  });

  // Initialize hasContent based on initial value and sync editor content
  useEffect(() => {
    if (!editor) return;
    // Treat an empty paragraph as no content
    setHasContent(!!value && value !== "<p></p>");
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
  }, [editor, value]);

  const errorMessage =
    touched[name] && errors[name] ? String(errors[name]) : null;

  const toggleColor = () => {
    const newColor = currentColor === "#29246D" ? "#000000" : "#29246D";
    setCurrentColor(newColor);
    editor?.chain().focus().setColor(newColor).run();
  };

  const handleAlignSelect = (alignment: string) => {
    if (editor) {
      editor.chain().focus().setTextAlign(alignment).run();
      setCurrentAlign(alignment);
    }
    setIsAlignOpen(false);
  };

  const renderCurrentAlignIcon = () => {
    switch (currentAlign) {
      case "center":
        return <FaAlignCenter className="w-[18px] h-[17px]" />;
      case "right":
        return <FaAlignRight className="w-[18px] h-[17px]" />;
      default:
        return <FaAlignLeft className="w-[18px] h-[17px]" />;
    }
  };

  const separator = (key: string) => (
    <span className="p-1 rounded" key={key}>
      <Image
        src={asset("line.svg")}
        alt=""
        width={8}
        height={20}
        style={{ width: 8, height: 20 }}
      />
    </span>
  );

  return (
    <div className="mb-4 relative">
      <div className="border rounded-2xl bg-[#29246D]/[0.03]">
        {editor && (
          <div className="p-2 flex items-center space-x-2">
            <div className="editorbtn flex items-center">
              <ToolbarButton
                onClick={() => editor.chain().focus().undo().run()}
                src={asset("undo.svg")}
                alt="undo"
                size={18}
              />
              <ToolbarButton
                onClick={() => editor.chain().focus().redo().run()}
                src={asset("redo.svg")}
                alt="redo"
                size={18}
              />
              {separator("sep-1")}
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                active={editor.isActive("bold")}
                src={asset("bold_line.svg")}
                alt="bold"
              />
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                active={editor.isActive("italic")}
                src={asset("italic_line.svg")}
                alt="italic"
              />
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                active={editor.isActive("underline")}
                src={asset("underline_line.svg")}
                alt="underline"
              />
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                active={editor.isActive("strike")}
                src={asset("strikethrough_line.svg")}
                alt="strike"
              />
              {separator("sep-2")}
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                active={editor.isActive("bulletList")}
                src={asset("list_check_line.svg")}
                alt="bullet list"
              />
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                active={editor.isActive("orderedList")}
                src={asset("list_ordered_line.svg")}
                alt="ordered list"
              />

              <div className="relative flex items-center">
                <div className="p-1 rounded">{renderCurrentAlignIcon()}</div>
                <button
                  type="button"
                  onClick={() => setIsAlignOpen(!isAlignOpen)}
                  className="p-1 rounded hover:bg-gray-200"
                >
                  {isAlignOpen ? (
                    <MdOutlineKeyboardArrowUp className="w-[18px] h-[18px]" />
                  ) : (
                    <MdOutlineKeyboardArrowDown className="w-[18px] h-[18px]" />
                  )}
                </button>
                {isAlignOpen && (
                  <div className="absolute -bottom-10 left-0 bg-white border rounded shadow-lg z-10 flex space-x-2 p-1">
                    {(
                      [
                        ["left", <FaAlignLeft key="l" className="w-[18px] h-[17px]" />],
                        ["center", <FaAlignCenter key="c" className="w-[18px] h-[17px]" />],
                        ["right", <FaAlignRight key="r" className="w-[18px] h-[17px]" />],
                      ] as const
                    ).map(([alignment, icon]) => (
                      <button
                        key={alignment}
                        type="button"
                        onClick={() => handleAlignSelect(alignment)}
                        className={`p-1 rounded ${
                          currentAlign === alignment
                            ? "bg-gray-300 hover:bg-gray-300"
                            : "hover:bg-gray-100"
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {separator("sep-3")}
              <button
                type="button"
                onClick={toggleColor}
                className="p-1 rounded hover:bg-gray-200 w-[19px] h-[19px] xss:h-[18px] xss:w-[20px]"
                style={{
                  backgroundColor: currentColor,
                  borderRadius: "50%",
                  border: "1px solid #ccc",
                }}
                title={
                  currentColor === "#29246D"
                    ? "Switch to Black"
                    : "Switch to Navy Blue"
                }
              />
            </div>
          </div>
        )}
        <div>
          <EditorContent
            editor={editor}
            className={`p-3 min-h-[100px] text-primary-5 placeholder:text-primary-5 placeholder:text-lg pt-0 ${
              selectedLanguage === "ar" ? "text-right" : "text-left"
            }`}
          />
        </div>
      </div>
      <label
        className={`absolute transition-all duration-200 text-primary-5 font-medium ${
          selectedLanguage === "ar" ? "right-[15px]" : "left-[15px]"
        } ${
          isFocused || hasContent ? "top-[2px] text-sm px-1" : "top-10 text-base"
        }`}
      >
        {label}
      </label>
      {errorMessage && (
        <div className="text-red-500 text-sm mt-1">{errorMessage}</div>
      )}
    </div>
  );
};

export default RichTextEditor;
