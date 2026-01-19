// CourseComposition.tsx
import React, { useEffect, useMemo, useRef } from "react";
import {
    AbsoluteFill,
    Sequence,
    Audio,
    useVideoConfig,
    useCurrentFrame,
} from "remotion";

/* ---------------------------------- Types --------------------------------- */

type CaptionChunk = {
    text: string;
    timestamp: [number, number];
};

type Caption = {
    chunks: CaptionChunk[];
    text?: string;
};

type Slide = {
    slideId: string;
    html: string;
    audioFileUrl: string;
    revealData?: string[] | null; // ✅ Fixed spelling and added null
    caption?: Caption | null; // ✅ Matches your database type
};

/* ----------------------- Reveal runtime (iframe side) ------------------------ */

const REVEAL_RUNTIME_SCRIPT = `
<script>
(function () {
  function reset() {
    document.querySelectorAll(".reveal").forEach(el =>
      el.classList.remove("is-on")
    );
  }

  function reveal(id) {
    var el = document.querySelector("[data-reveal='" + id + "']");
    if (el) el.classList.add("is-on");
  }

  window.addEventListener("message", function (e) {
    var msg = e.data;
    if (!msg) return;
    if (msg.type === "RESET") reset();
    if (msg.type === "REVEAL") reveal(msg.id);
  });
})();
</script>
`;

const injectRevealRuntime = (html: string) => {
    if (html.includes("</body>")) {
        return html.replace("</body>", `${REVEAL_RUNTIME_SCRIPT}</body>`);
    }
    return html + REVEAL_RUNTIME_SCRIPT;
};

/* ----------------------- Caption Display Component -------------------------- */

const CaptionDisplay = ({ chunks }: { chunks: CaptionChunk[] }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const time = frame / fps;

    const currentCaption = useMemo(() => {
        return chunks.find(
            (chunk) => time >= chunk.timestamp[0] && time < chunk.timestamp[1]
        );
    }, [chunks, time]);

    if (!currentCaption) return null;

    return (
        <div
            style={{
                position: "absolute",
                bottom: 60,
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
                padding: "0 40px",
                zIndex: 1000,
            }}
        >
            <div
                style={{
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    color: "white",
                    padding: "12px 24px",
                    borderRadius: 8,
                    fontSize: 24,
                    fontFamily: "Arial, sans-serif",
                    textAlign: "center",
                    maxWidth: "80%",
                    lineHeight: 1.4,
                }}
            >
                {currentCaption.text}
            </div>
        </div>
    );
};

/* ----------------------- Slide with reveal control -------------------------- */

const SlideIFrameWithReveal = ({ slide }: { slide: Slide }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const time = frame / fps;

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [ready, setReady] = React.useState(false);

    const revealPlan = useMemo(() => {
        const ids = slide.revealData ?? []; // ✅ Fixed: revealData not revelData
        const chunks = slide.caption?.chunks ?? [];
        return ids.map((id, i) => ({
            id,
            at: chunks[i]?.timestamp?.[0] ?? 0,
        }));
    }, [slide.revealData, slide.caption]); // ✅ Fixed dependency

    const handleLoad = () => {
        setReady(true);
        iframeRef.current?.contentWindow?.postMessage({ type: "RESET" }, "*");
    };

    useEffect(() => {
        if (!ready) return;
        const win = iframeRef.current?.contentWindow;
        if (!win) return;

        win.postMessage({ type: "RESET" }, "*");

        for (const step of revealPlan) {
            if (time >= step.at) {
                win.postMessage({ type: "REVEAL", id: step.id }, "*");
            }
        }
    }, [time, ready, revealPlan]);

    return (
        <AbsoluteFill>
            <iframe
                ref={iframeRef}
                srcDoc={injectRevealRuntime(slide.html || '')} // ✅ Handle null
                onLoad={handleLoad}
                sandbox="allow-scripts allow-same-origin"
                style={{ width: 1280, height: 720, border: "none" }}
            />
            {slide.audioFileUrl && <Audio src={slide.audioFileUrl} />} // ✅ Conditional render
            
            {/* ✅ Display captions */}
            {slide.caption?.chunks && (
                <CaptionDisplay chunks={slide.caption.chunks} />
            )}
        </AbsoluteFill>
    );
};


/* -------------------------- Course Composition ------------------------------- */
type Props = {
    slides: Slide[];
    durationsBySlideId: Record<string, number>;
}

export const CourseComposition = ({ slides, durationsBySlideId }: Props) => {
    const { fps } = useVideoConfig();

    const GAP_SECONDS = 1;
    const GAP_FRAMES = Math.round(GAP_SECONDS * fps);

    const timeline = useMemo(() => {
        let fromPosition = 0;

        return slides.map((slide) => {
            const dur = durationsBySlideId[slide.slideId] ?? Math.ceil(6 * fps);

            const item = { slide, fromPosition, dur };
            fromPosition += dur + GAP_FRAMES;

            return item;
        });
    }, [slides, durationsBySlideId, fps, GAP_FRAMES]);

    return (
        <AbsoluteFill style={{ backgroundColor: "#000" }}>
            {timeline.map(({ slide, fromPosition, dur }) => (
                <Sequence key={fromPosition} from={fromPosition} durationInFrames={dur}>
                    <SlideIFrameWithReveal slide={slide} />
                </Sequence>
            ))}
        </AbsoluteFill>
    );
};