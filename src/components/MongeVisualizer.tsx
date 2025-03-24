import { useEffect, useRef, useState } from 'react';

interface Circle {
  x: number;
  y: number;
  radius: number;
  color: string;
}

interface Point {
  x: number;
  y: number;
}

const MongeVisualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [windowSize, setWindowSize] = useState<{ width: number; height: number }>({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  
  const [time, setTime] = useState(0);

  const [circles, setCircles] = useState<Circle[]>([
    { x: window.innerWidth * 0.4, y: window.innerHeight * 0.3, radius: window.innerHeight * 0.04, color: 'rgba(255, 0, 0, 0.98)' },
    { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5, radius: window.innerHeight * 0.03, color: 'rgba(0, 0, 255, 0.98)' },
    { x: window.innerWidth * 0.6, y: window.innerHeight * 0.5, radius: window.innerHeight * 0.05, color: 'rgba(255, 255, 0, 0.98)' }
  ]);

  const [velocities, setVelocities] = useState<Point[]>([
    { x: 0.3, y: 0.2 },
    { x: -0.2, y: 0.3 },
    { x: 0.25, y: -0.25 }
  ]);

  // Update available colors array to just red, blue, yellow
  const availableColors = [
    'rgba(255, 0, 0, 0.98)',    // Pure Red
    'rgba(0, 0, 255, 0.98)',    // Pure Blue
    'rgba(255, 255, 0, 0.98)',  // Pure Yellow
  ];

  const getExternalTangentPoints = (c1: Circle, c2: Circle): [Point, Point, Point, Point] => {
    const dx = c2.x - c1.x;
    const dy = c2.y - c1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < Math.abs(c1.radius - c2.radius)) {
      throw new Error("Circles too close for external tangents");
    }
    
    const angle = Math.atan2(dy, dx);
    const theta = Math.acos((c1.radius - c2.radius) / dist);
    
    // First external tangent
    const x1 = c1.x + c1.radius * Math.cos(angle + theta);
    const y1 = c1.y + c1.radius * Math.sin(angle + theta);
    const x2 = c2.x + c2.radius * Math.cos(angle + theta);
    const y2 = c2.y + c2.radius * Math.sin(angle + theta);
    
    // Second external tangent
    const x3 = c1.x + c1.radius * Math.cos(angle - theta);
    const y3 = c1.y + c1.radius * Math.sin(angle - theta);
    const x4 = c2.x + c2.radius * Math.cos(angle - theta);
    const y4 = c2.y + c2.radius * Math.sin(angle - theta);
    
    return [
      { x: x1, y: y1 },
      { x: x2, y: y2 },
      { x: x3, y: y3 },
      { x: x4, y: y4 }
    ];
  };

  const getLineIntersection = (p1: Point, p2: Point, p3: Point, p4: Point): Point | null => {
    const denominator = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
    if (denominator === 0) return null;
    
    const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denominator;
    return {
      x: p1.x + ua * (p2.x - p1.x),
      y: p1.y + ua * (p2.y - p1.y)
    };
  };

  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      
      setWindowSize({ width: newWidth, height: newHeight });
      
      setCircles(prev => prev.map((circle, i) => ({
        ...circle,
        radius: newHeight * [0.04, 0.03, 0.05][i]
      })));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update animation speed to be much slower
  useEffect(() => {
    let animationFrameId: number;
    
    const animate = () => {
      setTime(prev => prev + 0.0005); // Much slower animation
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animationFrameId = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  // Update the circle movement effect
  useEffect(() => {
    const checkCircleCollision = (c1: Circle, c2: Circle): boolean => {
      const dx = c2.x - c1.x;
      const dy = c2.y - c1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < (c1.radius + c2.radius);
    };

    const resolveCircleCollision = (c1: Circle, c2: Circle, v1: Point, v2: Point): [Point, Point] => {
      const dx = c2.x - c1.x;
      const dy = c2.y - c1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const nx = dx / distance;
      const ny = dy / distance;
      const tx = -ny;
      const ty = nx;
      
      const v1n = nx * v1.x + ny * v1.y;
      const v1t = tx * v1.x + ty * v1.y;
      const v2n = nx * v2.x + ny * v2.y;
      const v2t = tx * v2.x + ty * v2.y;
      
      const v1nNew = v2n;
      const v2nNew = v1n;
      
      return [
        {
          x: v1nNew * nx + v1t * tx,
          y: v1nNew * ny + v1t * ty
        },
        {
          x: v2nNew * nx + v2t * tx,
          y: v2nNew * ny + v2t * ty
        }
      ];
    };

    const getNextColor = (currentColor: string): string => {
      const currentIndex = availableColors.indexOf(currentColor);
      return availableColors[(currentIndex + 1) % availableColors.length];
    };

    setCircles(prev => {
      const newCircles = [...prev];
      const newVelocities = [...velocities];
      
      for (let i = 0; i < newCircles.length; i++) {
        const circle = newCircles[i];
        const velocity = newVelocities[i];
        
        let newX = circle.x + velocity.x;
        let newY = circle.y + velocity.y;
        let colorChanged = false;
        
        // Wall collisions with color change
        if (newX - circle.radius <= 0) {
          newVelocities[i].x = Math.abs(velocity.x);
          newX = circle.radius;
          colorChanged = true;
        } else if (newX + circle.radius >= windowSize.width) {
          newVelocities[i].x = -Math.abs(velocity.x);
          newX = windowSize.width - circle.radius;
          colorChanged = true;
        }
        
        if (newY - circle.radius <= 0) {
          newVelocities[i].y = Math.abs(velocity.y);
          newY = circle.radius;
          colorChanged = true;
        } else if (newY + circle.radius >= windowSize.height) {
          newVelocities[i].y = -Math.abs(velocity.y);
          newY = windowSize.height - circle.radius;
          colorChanged = true;
        }
        
        newCircles[i] = {
          ...circle,
          x: newX,
          y: newY,
          color: colorChanged ? getNextColor(circle.color) : circle.color
        };
      }
      
      // Check and resolve circle-circle collisions
      for (let i = 0; i < newCircles.length; i++) {
        for (let j = i + 1; j < newCircles.length; j++) {
          if (checkCircleCollision(newCircles[i], newCircles[j])) {
            const [v1, v2] = resolveCircleCollision(
              newCircles[i],
              newCircles[j],
              newVelocities[i],
              newVelocities[j]
            );
            newVelocities[i] = v1;
            newVelocities[j] = v2;
            
            const dx = newCircles[j].x - newCircles[i].x;
            const dy = newCircles[j].y - newCircles[i].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const overlap = (newCircles[i].radius + newCircles[j].radius - distance) / 2;
            
            if (distance > 0) {
              const moveX = (dx / distance) * overlap;
              const moveY = (dy / distance) * overlap;
              
              newCircles[i].x -= moveX;
              newCircles[i].y -= moveY;
              newCircles[j].x += moveX;
              newCircles[j].y += moveY;
            }
          }
        }
      }
      
      setVelocities(newVelocities);
      return newCircles;
    });
  }, [time, windowSize]);

  const drawScene = (ctx: CanvasRenderingContext2D) => {
    // Dark background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, windowSize.width, windowSize.height);

    const intersectionPoints: Point[] = [];
    const tangentPoints: { start: Point; end: Point; color: string; }[] = [];
    
    let pairIndex = 0;
    // Use the circle colors for the tangent lines
    const pairColors = circles.map(circle => circle.color);

    // Draw circles first (no glow)
    circles.forEach(circle => {
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
      ctx.fillStyle = circle.color;
      ctx.fill();
      ctx.strokeStyle = circle.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    for (let i = 0; i < circles.length; i++) {
      for (let j = i + 1; j < circles.length; j++) {
        try {
          const points = getExternalTangentPoints(circles[i], circles[j]);
          const intersection = getLineIntersection(points[0], points[1], points[2], points[3]);

          if (intersection) {
            intersectionPoints.push(intersection);
            tangentPoints.push(
              { start: points[0], end: points[1], color: pairColors[pairIndex] },
              { start: points[2], end: points[3], color: pairColors[pairIndex] }
            );
          }
          pairIndex++;
        } catch (e) {
          continue;
        }
      }
    }

    // Draw tangent lines (no glow)
    tangentPoints.forEach((line) => {
      const dx = line.end.x - line.start.x;
      const dy = line.end.y - line.start.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      if (length === 0) return;

      const dirX = dx / length;
      const dirY = dy / length;
      const extendLength = Math.max(windowSize.width, windowSize.height) * 2;

      ctx.beginPath();
      ctx.moveTo(
        line.start.x - dirX * extendLength,
        line.start.y - dirY * extendLength
      );
      ctx.lineTo(
        line.start.x + dirX * extendLength,
        line.start.y + dirY * extendLength
      );
      ctx.strokeStyle = line.color;
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    if (intersectionPoints.length >= 2) {
      const slope = (intersectionPoints[1].y - intersectionPoints[0].y) / 
                   (intersectionPoints[1].x - intersectionPoints[0].x);
      
      // Draw collinearity line (no glow, just solid white)
      ctx.beginPath();
      ctx.moveTo(0, intersectionPoints[0].y - slope * intersectionPoints[0].x);
      ctx.lineTo(
        windowSize.width, 
        intersectionPoints[0].y + slope * (windowSize.width - intersectionPoints[0].x)
      );
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.98)';
      ctx.setLineDash([12, 12]);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw intersection points (no glow)
      intersectionPoints.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
        ctx.fill();
      });
    }

    // Draw title and theorem statement (no glow)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
    
    // Title
    ctx.font = 'bold 24px Arial';
    ctx.fillText("MONGE'S THEOREM", 20, 40);
    
    // Theorem statement
    ctx.font = '16px Arial';
    const statement = [
      "For any three circles in a plane, none of which",
      "is completely inside another, the intersection",
      "points of their external tangent lines are",
      "collinear (lie on a straight line)."
    ];
    
    statement.forEach((line, i) => {
      ctx.fillText(line, 20, 80 + i * 25);
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = windowSize.width;
    canvas.height = windowSize.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawScene(ctx);
  }, [circles, windowSize]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  );
};

export default MongeVisualizer; 