"use client";

/**
 * プレイヤーのオンライン/オフライン状態を示す小さなインジケータ。
 * 多人数ゲームのプレイヤー一覧に添えて使う。
 */
export function PresenceDot({
  online,
  showLabel = false,
}: {
  online: boolean;
  showLabel?: boolean;
}) {
  return (
    <span
      title={online ? "オンライン" : "オフライン"}
      className="inline-flex items-center gap-1 text-xs align-middle"
    >
      <span
        aria-hidden
        className={`inline-block w-2.5 h-2.5 rounded-full ${
          online ? "bg-emerald-400 shadow-[0_0_6px_1px_rgba(52,211,153,0.7)]" : "bg-gray-500"
        }`}
      />
      {showLabel && (
        <span className={online ? "text-emerald-300" : "text-gray-400"}>
          {online ? "オンライン" : "オフライン"}
        </span>
      )}
    </span>
  );
}
