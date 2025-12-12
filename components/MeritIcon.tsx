import React from 'react';
import {
    Trophy, Medal, Star, Award, Crown, Flag, Target, ThumbsUp,
    Zap, Heart, Shield, Gem, Rocket, Mountain, Flame, Smile,
    CheckCircle2, Clock, Calendar, Gift, Briefcase
} from 'lucide-react';

export const VALID_ICONS = [
    'Trophy', 'Medal', 'Star', 'Award', 'Crown', 'Flag', 'Target', 'ThumbsUp',
    'Zap', 'Heart', 'Shield', 'Gem', 'Rocket', 'Mountain', 'Flame', 'Smile',
    'CheckCircle2', 'Clock', 'Calendar', 'Gift', 'Briefcase'
];

interface MeritIconProps extends React.ComponentProps<'svg'> {
    iconName: string;
}

export const MeritIcon: React.FC<MeritIconProps> = ({ iconName, className = "w-6 h-6", ...props }) => {
    // Mapping of icon names to components
    const icons: Record<string, React.ElementType> = {
        Trophy, Medal, Star, Award, Crown, Flag, Target, ThumbsUp,
        Zap, Heart, Shield, Gem, Rocket, Mountain, Flame, Smile,
        CheckCircle2, Clock, Calendar, Gift, Briefcase
    };

    const IconComponent = icons[iconName];

    if (IconComponent) {
        return <IconComponent className={className} {...props} />;
    }

    // Fallback: If it's not a known icon name, render it as text/emoji (legacy support)
    return <span className={className + " flex items-center justify-center font-normal not-italic text-lg"}>{iconName}</span>;
};
