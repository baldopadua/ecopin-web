'use client';
import { useEffect, useRef } from 'react';

export default function FloatingParticles({ isDark }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let animationFrameId;
    let particles = [];
    const particleCount = 50;
    
    // Mouse interaction state
    let target = { x: null, y: null, active: false };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();
    
    const handleMouseClick = (e) => {
      target.x = e.clientX;
      target.y = e.clientY;
      target.active = true;
      
      // Save their current state as "home" before they get pulled away
      particles.forEach(p => {
        // Only save home if they aren't already returning (prevents double-clicking bugs)
        if (!p.returning) {
          p.homeX = p.x;
          p.homeY = p.y;
          p.homeVx = p.vx;
          p.homeVy = p.vy;
        }
        p.returning = true;
      });

      // Release target after a short burst so they start returning home
      setTimeout(() => { target.active = false; }, 800);
    };
    
    window.addEventListener('click', handleMouseClick);

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 3.5; 
        this.vy = (Math.random() - 0.5) * 3.5;
        this.radius = Math.random() * 3 + 1.5;
        this.alpha = Math.random() * 0.8 + 0.2;
        
        // Return logic states
        this.returning = false;
        this.homeX = 0;
        this.homeY = 0;
        this.homeVx = 0;
        this.homeVy = 0;
      }
      
      update() {
        if (target.active) {
          // Accelerate rapidly towards target
          const dx = target.x - this.x;
          const dy = target.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 5) {
            this.vx += (dx / dist) * 2.5;
            this.vy += (dy / dist) * 2.5;
          }
          // Strong friction during pull to simulate explosive magnetic pull
          this.vx *= 0.90;
          this.vy *= 0.90;
        } else if (this.returning) {
          // Accelerate back to saved home position
          const dx = this.homeX - this.x;
          const dy = this.homeY - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 15) {
            // Snap to home and restore original velocity
            this.x = this.homeX;
            this.y = this.homeY;
            this.vx = this.homeVx;
            this.vy = this.homeVy;
            this.returning = false;
          } else {
            // Seek home
            this.vx += (dx / dist) * 1.5;
            this.vy += (dy / dist) * 1.5;
            this.vx *= 0.88; // Dampen so they settle back elegantly
            this.vy *= 0.88;
          }
        } else {
          // Normal wandering logic
          this.vx *= 0.99;
          this.vy *= 0.99;
          const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
          if (speed < 1.5) {
            this.vx *= 1.05;
            this.vy *= 1.05;
          }
        }

        this.x += this.vx;
        this.y += this.vy;
        
        // Strict boundary checking
        if (this.x < 0) { this.x = 0; this.vx *= -1; }
        if (this.x > canvas.width) { this.x = canvas.width; this.vx *= -1; }
        if (this.y < 0) { this.y = 0; this.vy *= -1; }
        if (this.y > canvas.height) { this.y = canvas.height; this.vy *= -1; }
      }
      
      draw(ctx, isDark) {
        const r = isDark ? 147 : 0;
        const g = isDark ? 197 : 82;
        const b = isDark ? 253 : 204;

        // Draw glowing head
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${this.alpha})`;
        ctx.shadowBlur = 20;
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 1)`;
        ctx.fill();
        ctx.shadowBlur = 0; // reset for lines
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw faint connections between particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            const alpha = (1 - distance / 150) * 0.25;
            const r = isDark ? 147 : 0;
            const g = isDark ? 197 : 82;
            const b = isDark ? 253 : 204;
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
      }

      // Update and draw particles over connections
      particles.forEach(p => {
        p.update();
        p.draw(ctx, isDark);
      });
      
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('click', handleMouseClick);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isDark]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 pointer-events-none z-10 opacity-100"
    />
  );
}
