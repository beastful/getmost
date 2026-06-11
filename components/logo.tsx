export default function Logo({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            shapeRendering="geometricPrecision" 
            stroke="currentColor"
            strokeWidth="4" 
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 90 70">
            <path d="M5 25 25 5 45 25 65 5 85 25 85 65 65 65 65 45 45 25 25 45 25 65 5 65 5 25 25 5M5 65 25 45M25 5 25 45 5 25M65 45 65 5M85 65 65 45 85 25M25 45"/>
        </svg>
    );
}
