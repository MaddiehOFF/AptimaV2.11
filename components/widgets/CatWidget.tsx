import React, { useState, useEffect, useRef } from 'react';
import { X, MessageCircle } from 'lucide-react';
import { playSound } from '../../utils/soundUtils';

interface CatWidgetProps {
    hidden: boolean;
    onClose: () => void;
}

export const CatWidget: React.FC<CatWidgetProps> = ({ hidden, onClose }) => {
    // Persistence Key
    const STORAGE_KEY_POS = 'sushiblack_cat_pos';

    // State
    const [position, setPosition] = useState<{ x: number, y: number }>({ x: 20, y: 20 }); // Left, Bottom
    const [isDragging, setIsDragging] = useState(false);
    const [mood, setMood] = useState<'SLEEPING' | 'AWAKE' | 'MEOW'>('SLEEPING');
    const [showBubble, setShowBubble] = useState(false);

    const dragStartRef = useRef<{ x: number, y: number } | null>(null);
    const catRef = useRef<HTMLDivElement>(null);

    // Initial Load
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY_POS);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setPosition(parsed);
            } catch (e) {
                console.error("Failed to parse cat pos", e);
            }
        }
    }, []);

    // Idle Timer
    useEffect(() => {
        if (mood !== 'SLEEPING') {
            const timer = setTimeout(() => {
                setMood('SLEEPING');
                setShowBubble(false);
            }, 8000); // Back to sleep after 8s
            return () => clearTimeout(timer);
        }
    }, [mood]);

    if (hidden) return null;

    // Handlers
    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        // Record where we clicked relative to the cat's bottom-left anchor?
        // Actually, let's track delta.
        // Screen coords:
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        (e.target as Element).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || !dragStartRef.current) return;
        e.preventDefault();

        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;

        // Update Position (Inverted Y because we use 'bottom')
        // dx increases Left (x)
        // dy increases Top => decreases Bottom (y)
        const newPos = {
            x: position.x + dx,
            y: position.y - dy
        };

        // Constraints (Simple)
        // Assume window bounds logic or just loose constraints
        // Don't let it go off screen too much
        // Max X roughly window.innerWidth - 100
        // Max Y roughly window.innerHeight - 100
        // Min 0
        const constrained = {
            x: Math.max(-50, Math.min(window.innerWidth - 50, newPos.x)),
            y: Math.max(-50, Math.min(window.innerHeight - 50, newPos.y))
        };

        setPosition(constrained);
        dragStartRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (isDragging) {
            setIsDragging(false);
            dragStartRef.current = null;
            (e.target as Element).releasePointerCapture(e.pointerId);
            // Save
            localStorage.setItem(STORAGE_KEY_POS, JSON.stringify(position));
        }
    };

    const handleCatClick = () => {
        if (isDragging) return; // Don't meow if just finished drag? 
        // Actually pointerUp fires after click sometimes.
        // Let's rely on simple click. 
        // If we moved significantly, it's a drag.

        playSound('MEOW');
        setMood('MEOW');
        setShowBubble(true);
        setTimeout(() => setMood('AWAKE'), 800); // 0.8s meow animation
    };

    // Images
    const getCatImage = () => {
        switch (mood) {
            case 'MEOW': return '/assets/cat/meow.png';
            case 'AWAKE': return '/assets/cat/awake.png';
            default: return '/assets/cat/sleeping.png';
        }
    };

    return (
        <div
            ref={catRef}
            style={{
                position: 'fixed', // Fixed to viewport so it floats over everything in Office, or 'absolute' if Office container is relative and full height. 
                // User said "widget flotante del módulo Oficina".
                // If I use 'fixed', it persists even if I scroll the office content. Usually desirable for a 'pet'.
                // If I use 'absolute', it scrolls with content.
                // "Floating widget" implies Fixed usually.
                // But user said "esquina inferior izquierda del área de trabajo...".
                // I will use 'absolute' relative to the Office Container if possible, but 'fixed' is safer for "always visible".
                // Let's use 'absolute' and ensure parent has 'relative' and 'h-full'.
                // Wait, User said "Al cambiar entre pestañas NO debe desaparecer". Tabs switch content inside Office.
                // So it must be outside the Tab Content, but inside AdministrativeOffice.
                // AdministrativeOffice has a main container.
                left: position.x,
                bottom: position.y,
                zIndex: 50,
                touchAction: 'none', // Critical for dragging
                cursor: isDragging ? 'grabbing' : 'grab'
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="select-none group"
        >
            {/* Bubble */}
            {showBubble && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-3 py-1 rounded-full whitespace-nowrap animate-bounce">
                    MIAU
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/80" />
                </div>
            )}

            {/* Close Button (Hidden by default, show on hover) */}
            <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md"
                title="Ocultar Gatito"
                onPointerDown={(e) => e.stopPropagation()} // Prevent drag start
            >
                <X size={12} />
            </button>

            {/* Cat Image */}
            <img
                src={getCatImage()}
                alt="Office Cat"
                className="w-24 h-24 object-contain drop-shadow-lg transition-transform hover:scale-105 active:scale-95 pixelated"
                style={{ imageRendering: 'pixelated' }}
                onClick={handleCatClick}
                draggable={false}
            />
        </div>
    );
};
