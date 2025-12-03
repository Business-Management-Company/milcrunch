import { useState, useEffect } from "react";

interface CountdownTimerProps {
  targetDate: Date;
  label?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const CountdownTimer = ({ targetDate, label = "Time Until Event" }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const timeUnits = [
    { value: timeLeft.days, label: "Days" },
    { value: timeLeft.hours, label: "Hours" },
    { value: timeLeft.minutes, label: "Minutes" },
    { value: timeLeft.seconds, label: "Seconds" },
  ];

  return (
    <div className="text-center">
      {label && (
        <p className="text-sm text-muted-foreground mb-4 uppercase tracking-wider">{label}</p>
      )}
      <div className="flex justify-center gap-3 md:gap-6">
        {timeUnits.map((unit) => (
          <div
            key={unit.label}
            className="flex flex-col items-center"
          >
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-2 backdrop-blur-sm">
              <span className="font-headline text-2xl md:text-3xl font-extrabold text-primary">
                {String(unit.value).padStart(2, "0")}
              </span>
            </div>
            <span className="text-xs md:text-sm text-muted-foreground font-medium">
              {unit.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CountdownTimer;
