/**
 * Closeout Copilot Deck
 * Navigation: Arrow keys (desktop), Vertical scroll (mobile)
 */

(function() {
    'use strict';

    // Elements
    const slides = document.querySelectorAll('.slide');
    const progressBar = document.getElementById('progressBar');
    const slideDots = document.getElementById('slideDots');
    const currentSlideEl = document.getElementById('currentSlide');
    const totalSlidesEl = document.getElementById('totalSlides');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    // State
    let currentSlide = 0;
    const totalSlides = slides.length;
    let isAnimating = false;
    let isMobile = window.innerWidth <= 768;

    // Initialize
    function init() {
        totalSlidesEl.textContent = totalSlides;
        createDots();
        updateUI();
        bindEvents();
        checkMobile();
        setupLogoFallbacks();
    }

    // Setup fallbacks for logo images that fail to load
    function setupLogoFallbacks() {
        const logoImages = document.querySelectorAll('.logo-card__img');

        logoImages.forEach(img => {
            const fallback = img.nextElementSibling;
            if (!fallback || !fallback.classList.contains('logo-card__fallback')) return;

            // Handle load error
            img.addEventListener('error', () => {
                img.classList.add('hidden');
                fallback.classList.add('visible');
            });

            // Check if image is already broken (cached error state)
            if (img.complete && img.naturalWidth === 0) {
                img.classList.add('hidden');
                fallback.classList.add('visible');
            }
        });
    }

    // Create navigation dots
    function createDots() {
        for (let i = 0; i < totalSlides; i++) {
            const dot = document.createElement('button');
            dot.classList.add('slide-dot');
            dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
            dot.addEventListener('click', () => goToSlide(i));
            slideDots.appendChild(dot);
        }
    }

    // Update UI elements
    function updateUI() {
        // Update progress bar
        const progress = ((currentSlide + 1) / totalSlides) * 100;
        progressBar.style.width = `${progress}%`;

        // Update slide counter
        currentSlideEl.textContent = currentSlide + 1;

        // Update dots
        const dots = slideDots.querySelectorAll('.slide-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentSlide);
        });

        // Update nav buttons
        prevBtn.disabled = currentSlide === 0;
        nextBtn.disabled = currentSlide === totalSlides - 1;

        // Update slides (desktop only)
        if (!isMobile) {
            slides.forEach((slide, index) => {
                slide.classList.toggle('active', index === currentSlide);
            });
        }
    }

    // Go to specific slide
    function goToSlide(index) {
        if (isAnimating || index === currentSlide) return;
        if (index < 0 || index >= totalSlides) return;

        isAnimating = true;
        currentSlide = index;
        updateUI();

        if (isMobile) {
            slides[index].scrollIntoView({ behavior: 'smooth' });
        }

        setTimeout(() => {
            isAnimating = false;
        }, 500);
    }

    // Next slide
    function nextSlide() {
        if (currentSlide < totalSlides - 1) {
            goToSlide(currentSlide + 1);
        }
    }

    // Previous slide
    function prevSlide() {
        if (currentSlide > 0) {
            goToSlide(currentSlide - 1);
        }
    }

    // Handle keyboard navigation
    function handleKeydown(e) {
        if (isMobile) return;

        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
            case ' ':
            case 'PageDown':
                e.preventDefault();
                nextSlide();
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
            case 'PageUp':
                e.preventDefault();
                prevSlide();
                break;
            case 'Home':
                e.preventDefault();
                goToSlide(0);
                break;
            case 'End':
                e.preventDefault();
                goToSlide(totalSlides - 1);
                break;
        }
    }

    // Handle wheel events (desktop)
    let wheelTimeout;
    function handleWheel(e) {
        if (isMobile) return;

        clearTimeout(wheelTimeout);
        wheelTimeout = setTimeout(() => {
            if (e.deltaY > 0) {
                nextSlide();
            } else if (e.deltaY < 0) {
                prevSlide();
            }
        }, 50);
    }

    // Handle touch swipe (for hybrid devices)
    let touchStartY = 0;
    let touchEndY = 0;

    function handleTouchStart(e) {
        if (isMobile) return;
        touchStartY = e.changedTouches[0].screenY;
    }

    function handleTouchEnd(e) {
        if (isMobile) return;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    }

    function handleSwipe() {
        const diff = touchStartY - touchEndY;
        const threshold = 50;

        if (Math.abs(diff) > threshold) {
            if (diff > 0) {
                nextSlide();
            } else {
                prevSlide();
            }
        }
    }

    // Handle scroll on mobile
    let scrollTimeout;
    function handleScroll() {
        if (!isMobile) return;

        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            // Find which slide is most visible
            let maxVisible = 0;
            let visibleSlide = 0;

            slides.forEach((slide, index) => {
                const rect = slide.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
                const visiblePercent = visibleHeight / viewportHeight;

                if (visiblePercent > maxVisible) {
                    maxVisible = visiblePercent;
                    visibleSlide = index;
                }
            });

            if (visibleSlide !== currentSlide) {
                currentSlide = visibleSlide;
                updateUI();
            }
        }, 100);
    }

    // Check if mobile
    function checkMobile() {
        const wasMobile = isMobile;
        isMobile = window.innerWidth <= 768;

        if (wasMobile !== isMobile) {
            if (!isMobile) {
                // Switched to desktop
                document.body.style.overflow = 'hidden';
                updateUI();
            } else {
                // Switched to mobile
                document.body.style.overflow = '';
                slides.forEach(slide => slide.classList.add('active'));
            }
        }
    }

    // Bind events
    function bindEvents() {
        // Keyboard
        document.addEventListener('keydown', handleKeydown);

        // Mouse wheel (desktop)
        document.addEventListener('wheel', handleWheel, { passive: true });

        // Touch (for hybrid devices on desktop mode)
        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });

        // Scroll (mobile)
        window.addEventListener('scroll', handleScroll, { passive: true });

        // Resize
        window.addEventListener('resize', checkMobile);

        // Navigation buttons
        prevBtn.addEventListener('click', prevSlide);
        nextBtn.addEventListener('click', nextSlide);
    }

    // Start
    init();
})();
