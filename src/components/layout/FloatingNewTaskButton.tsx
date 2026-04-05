"use client";

export default function FloatingNewTaskButton({
  onClick,
}: {
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="hidden md:flex items-center justify-center fixed bottom-7 right-8 z-40 w-[52px] h-[52px] bg-primary rounded-2xl hover:scale-110 active:scale-95 transition-all duration-300 group cursor-pointer"
      style={{
        boxShadow: "0 8px 24px rgba(43, 124, 238, 0.35)",
      }}
    >
      <span className="material-symbols-outlined text-[26px] text-white group-hover:rotate-90 transition-transform duration-300">
        add
      </span>
    </button>
  );
}
