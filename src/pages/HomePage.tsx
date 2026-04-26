import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ChevronDown, MapPin, Users, Trophy, Calendar, Star, LogIn, Menu, X, Download, ZoomIn, Heart, Target } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Event } from '../types'
import { usePWAInstall } from '../hooks/usePWAInstall'
import { formatEventDateInTimezone } from '../utils/eventDateTime'

export default function HomePage() {
  const navigate = useNavigate()
  const { shouldShowButton: shouldShowInstallButton } = usePWAInstall()
  const [navScrolled, setNavScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 640 : false)
  const carouselTrackRef = useRef<HTMLDivElement>(null)
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartX = useRef<number>(0)
  const touchEndX = useRef<number>(0)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const touchStateRef = useRef({ 
    distance: 0, 
    center: { x: 0, y: 0 },
    lastScale: 1,
    lastPosition: { x: 0, y: 0 }
  })
  const imageRef = useRef<HTMLImageElement>(null)
  
  // 滚动动画 refs
  const aboutTextRef = useRef<HTMLDivElement>(null)
  const aboutImageRef = useRef<HTMLDivElement>(null)
  const activitiesTitleRef = useRef<HTMLDivElement>(null)
  const galleryTitleRef = useRef<HTMLDivElement>(null)
  const [visibleElements, setVisibleElements] = useState<Set<string>>(new Set())

  // 活动回顾图片数据
  const activityImages = [
    {
      src: 'https://images.unsplash.com/photo-1592919505780-303950717480?q=80&w=2070',
      date: 'March 15, 2025',
      title: '春季女子錦標賽',
      location: 'Mayfair Lakes',
      participants: '48 Players'
    },
    {
      src: 'https://images.unsplash.com/photo-1530028828-25e8270d5d0a?q=80&w=2070',
      date: 'February 20, 2025',
      title: '專業技術培訓課程',
      location: 'Richmond',
      participants: '32 Members'
    },
    {
      src: 'https://images.unsplash.com/photo-1596727362302-b8d891c42ab8?q=80&w=2070',
      date: 'January 18, 2025',
      title: '新年慈善友誼賽',
      location: 'Quilchena',
      participants: '60 Participants'
    }
  ]

  // 会员风采图片
  const galleryImages = [
    '/member_gallery1.webp',
    '/member_gallery2.webp',
    '/member_gallery3.webp',
    '/member_gallery4.webp',
    '/member_gallery5.webp',
    '/member_gallery6.webp',
    '/member_gallery7.webp',
    '/member_gallery8.webp',
    '/member_gallery9.webp'
  ]

  useEffect(() => {
    fetchPublishedArticles()
    
    // Navbar scroll effect
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setNavScrolled(true)
      } else {
        setNavScrolled(false)
      }
    }

    // Window resize handler
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
      setIsMobile(window.innerWidth < 640)
    }

    window.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', handleResize)
    
    // 键盘快捷键：ESC 关闭 lightbox，左右箭头切换图片
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxOpen) {
        if (e.key === 'Escape') {
          setLightboxOpen(false)
        } else if (e.key === 'ArrowLeft') {
          setLightboxIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length)
        } else if (e.key === 'ArrowRight') {
          setLightboxIndex((prev) => (prev + 1) % galleryImages.length)
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [lightboxOpen, galleryImages.length])

  // 重置缩放当切换图片或关闭时
  useEffect(() => {
    if (lightboxOpen) {
      setScale(1)
      setPosition({ x: 0, y: 0 })
      touchStateRef.current = { 
        distance: 0, 
        center: { x: 0, y: 0 },
        lastScale: 1,
        lastPosition: { x: 0, y: 0 }
      }
    }
  }, [lightboxIndex, lightboxOpen])

  // 计算两点距离（用于图片缩放）
  const getImageDistance = (t1: React.Touch, t2: React.Touch) => {
    const dx = t2.clientX - t1.clientX
    const dy = t2.clientY - t1.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  // 计算两点中心（用于图片缩放）
  const getImageCenter = (t1: React.Touch, t2: React.Touch) => {
    return {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2
    }
  }

  // 图片触摸开始
  const handleImageTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = getImageDistance(e.touches[0], e.touches[1])
      const center = getImageCenter(e.touches[0], e.touches[1])
      touchStateRef.current = {
        distance,
        center,
        lastScale: scale,
        lastPosition: position
      }
    } else if (e.touches.length === 1 && scale > 1) {
      // 单指拖动准备
      const touch = e.touches[0]
      touchStateRef.current = {
        ...touchStateRef.current,
        center: { x: touch.clientX, y: touch.clientY },
        lastPosition: position
      }
    }
  }

  // 图片触摸移动 - 优化性能
  const handleImageTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const distance = getImageDistance(e.touches[0], e.touches[1])
      const center = getImageCenter(e.touches[0], e.touches[1])
      
      if (touchStateRef.current.distance > 0) {
        const scaleChange = distance / touchStateRef.current.distance
        const newScale = Math.max(1, Math.min(5, touchStateRef.current.lastScale * scaleChange))
        
        // 计算位置偏移（以缩放中心为基准）
        const deltaX = center.x - touchStateRef.current.center.x
        const deltaY = center.y - touchStateRef.current.center.y
        
        setScale(newScale)
        setPosition({
          x: touchStateRef.current.lastPosition.x + deltaX,
          y: touchStateRef.current.lastPosition.y + deltaY
        })
      }
    } else if (e.touches.length === 1 && scale > 1) {
      // 单指拖动（仅在放大时）
      e.preventDefault()
      const touch = e.touches[0]
      const deltaX = touch.clientX - touchStateRef.current.center.x
      const deltaY = touch.clientY - touchStateRef.current.center.y
      
      setPosition({
        x: touchStateRef.current.lastPosition.x + deltaX,
        y: touchStateRef.current.lastPosition.y + deltaY
      })
    }
  }

  // 图片触摸结束
  const handleImageTouchEnd = () => {
    touchStateRef.current.lastScale = scale
    touchStateRef.current.lastPosition = position
    if (scale < 1) {
      setScale(1)
      setPosition({ x: 0, y: 0 })
      touchStateRef.current.lastScale = 1
      touchStateRef.current.lastPosition = { x: 0, y: 0 }
    }
  }

  // 双击缩放
  const handleDoubleClick = () => {
    if (scale === 1) {
      setScale(2)
      touchStateRef.current.lastScale = 2
    } else {
      setScale(1)
      setPosition({ x: 0, y: 0 })
      touchStateRef.current.lastScale = 1
      touchStateRef.current.lastPosition = { x: 0, y: 0 }
    }
  }

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const elementId = entry.target.getAttribute('data-animate-id')
          if (elementId) {
            setVisibleElements((prev) => new Set([...prev, elementId]))
          }
        }
      })
    }, observerOptions)

    // Wait for DOM to update before observing
    const timeoutId = setTimeout(() => {
      const elements = document.querySelectorAll('[data-animate-id]')
      elements.forEach((el) => observer.observe(el))
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      const elements = document.querySelectorAll('[data-animate-id]')
      elements.forEach((el) => observer.unobserve(el))
    }
  }, [events, loading])

  const marqueeOffsetRef = useRef<number>(0)
  const [isMarqueePaused, setIsMarqueePaused] = useState(false)
  const currentIndexRef = useRef<number>(0)
  const animationFrameRef = useRef<number | null>(null)
  const frameCountRef = useRef<number>(0)

  useEffect(() => {
    // Marquee auto scroll - continuous left scrolling
    const animate = () => {
      if (carouselTrackRef.current && !isMarqueePaused) {
        marqueeOffsetRef.current -= 1
        carouselTrackRef.current.style.transition = 'none'
        carouselTrackRef.current.style.transform = `translateX(${marqueeOffsetRef.current}px)`
        
        // Update carouselIndex based on current scroll position (throttle to every 5 frames)
        frameCountRef.current += 1
        if (frameCountRef.current % 5 === 0) {
          if (carouselTrackRef.current && carouselTrackRef.current.children.length > 0) {
            const itemWidth = carouselTrackRef.current.children[0]?.clientWidth || 0
            if (itemWidth > 0) {
              const gap = windowWidth <= 768 ? 16 : windowWidth <= 1024 ? 30 : 30
              const totalWidth = galleryImages.length * (itemWidth + gap)
              const currentOffset = Math.abs(marqueeOffsetRef.current)
              
              const itemWithGap = itemWidth + gap
              
              // Check if we need to reset - reset when we've scrolled past the first set
              // Reset when the duplicate set's first image is about to enter the viewport
              if (currentOffset >= totalWidth) {
                // Reset to start of first set, maintaining smooth transition
                const overflow = currentOffset - totalWidth
                marqueeOffsetRef.current = -overflow
                // Set index to 0 when resetting
                if (currentIndexRef.current !== 0) {
                  currentIndexRef.current = 0
                  setCarouselIndex(0)
                }
    } else {
                // Normal detection - find which image is closest to center
                const container = carouselTrackRef.current.parentElement
                if (container) {
                  const containerRect = container.getBoundingClientRect()
                  const containerCenterX = containerRect.left + containerRect.width / 2
                  
                  // Find which image's center is closest to container center (only check first set)
                  let closestIndex = 0
                  let minDistance = Infinity
                  
                  for (let i = 0; i < galleryImages.length; i++) {
                    const child = carouselTrackRef.current.children[i] as HTMLElement
                    if (child) {
                      const childRect = child.getBoundingClientRect()
                      const childCenterX = childRect.left + childRect.width / 2
                      const distance = Math.abs(childCenterX - containerCenterX)
                      
                      if (distance < minDistance) {
                        minDistance = distance
                        closestIndex = i
                      }
                    }
                  }
                  
                  // Update if index changed
                  if (closestIndex !== currentIndexRef.current) {
                    currentIndexRef.current = closestIndex
                    setCarouselIndex(closestIndex)
                  }
                }
              }
            }
          }
        }
        
        animationFrameRef.current = requestAnimationFrame(animate)
      }
    }
    
    if (!isMarqueePaused && carouselTrackRef.current) {
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
    }
    }
  }, [windowWidth, galleryImages.length, isMarqueePaused])

  const fetchPublishedArticles = async () => {
    try {
      setLoading(true)
      if (!supabase) return
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('article_published', true)
        .eq('is_public', true)
        .order('article_published_at', { ascending: false })
        .limit(3)

      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('获取活动回顾失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const getItemsPerPage = () => {
    if (windowWidth <= 768) return 1
    if (windowWidth <= 1024) return 2
    return 3
  }

  const maxIndex = Math.max(0, galleryImages.length - getItemsPerPage())

  const goToIndex = (index: number) => {
    if (isTransitioning || !carouselTrackRef.current) return
    
    // Pause marquee
    setIsMarqueePaused(true)
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    setIsTransitioning(true)
    setCarouselIndex(index)
    currentIndexRef.current = index
    
    const itemWidth = carouselTrackRef.current.children[0]?.clientWidth || 0
    const gap = windowWidth <= 768 ? 16 : windowWidth <= 1024 ? 30 : 30
    const containerWidth = carouselTrackRef.current.parentElement?.clientWidth || 0
    const itemWithGap = itemWidth + gap
    
    // Calculate offset to center the selected item (use first set of images)
    const offset = -(index * itemWithGap) + (containerWidth - itemWidth) / 2
    marqueeOffsetRef.current = offset
    
    carouselTrackRef.current.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
    carouselTrackRef.current.style.transform = `translateX(${offset}px)`

    setTimeout(() => {
      setIsTransitioning(false)
      // Resume marquee after 3 seconds
      setTimeout(() => {
        setIsMarqueePaused(false)
      }, 3000)
    }, 600)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchEndX.current = touchStartX.current
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    if (touchStartX.current === 0) return
    
    const distance = touchStartX.current - touchEndX.current
    const minSwipeDistance = 50 // 最小滑动距离

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        // 向左滑动，显示下一张
        const nextIndex = carouselIndex >= maxIndex ? 0 : carouselIndex + 1
        goToIndex(nextIndex)
        } else {
        // 向右滑动，显示上一张
        const prevIndex = carouselIndex <= 0 ? maxIndex : carouselIndex - 1
        goToIndex(prevIndex)
      }
    }

    // 重置
    touchStartX.current = 0
    touchEndX.current = 0
  }

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault()
    const element = document.getElementById(targetId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="min-h-screen" style={{ fontFamily: '"Montserrat", sans-serif', background: '#1a1a1a', color: '#fff' }}>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap');
        
        :root {
          --primary: #43a047;
          --accent: #ec407a;
          --pink: #f06292;
          --dark: #1a1a1a;
          --light: #f8f6f3;
        }

        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
          from {
            opacity: 0;
            transform: translateY(30px);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateX(-50%) translateY(0);
          }
          50% {
            transform: translateX(-50%) translateY(-15px);
          }
        }

        .animate-fade-in {
          animation: fadeInUp 1s 0.3s forwards;
        }

        .animate-fade-in-delay {
          animation: fadeInUp 1s 0.5s forwards;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        /* Scroll animations */
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .scroll-animate {
          opacity: 0;
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }

        .scroll-animate-left {
          opacity: 0;
          transform: translateX(-50px);
          transition: opacity 0.8s ease-out, transform 0.8s ease-out;
        }

        .scroll-animate-right {
          opacity: 0;
          transform: translateX(50px);
          transition: opacity 0.8s ease-out, transform 0.8s ease-out;
        }

        .scroll-animate-up {
          opacity: 0;
          transform: translateY(50px);
          transition: opacity 0.8s ease-out, transform 0.8s ease-out;
        }

        .scroll-animate-visible {
          opacity: 1 !important;
          transform: translateX(0) translateY(0) !important;
        }

        .nav-link {
          position: relative;
        }

        .nav-link::after {
          content: "";
          position: absolute;
          bottom: -5px;
          left: 0;
          width: 0;
          height: 1px;
          background: var(--accent);
          transition: width 0.3s;
        }

        .nav-link:hover::after {
          width: 100%;
        }

        .hero-btn-primary {
          position: relative;
          overflow: hidden;
        }

        .hero-btn-primary::before {
          content: "";
          position: absolute;
          inset: 0;
          background: var(--primary);
          transform: translateX(-100%);
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .hero-btn-primary:hover::before {
          transform: translateX(0);
        }

        .hero-btn-secondary {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .hero-btn-secondary:hover {
          border-color: var(--accent);
        }

        .activity-card {
          position: relative;
        }

        .activity-card .activity-overlay {
          transition: background 0.4s;
        }

        .activity-card:hover .activity-overlay {
          background: linear-gradient(to top, rgba(236, 64, 122, 0.9), transparent 60%) !important;
        }

        .activity-card img {
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .activity-card:hover img {
          transform: scale(1.05);
        }

        /* 粉色云朵流动动画 */
        @keyframes cloudMove1 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.4;
          }
          25% {
            transform: translate(50%, -30%) scale(1.3);
            opacity: 0.7;
          }
          50% {
            transform: translate(80%, 15%) scale(0.8);
            opacity: 0.6;
          }
          75% {
            transform: translate(50%, 30%) scale(1.2);
            opacity: 0.65;
          }
        }

        @keyframes cloudMove2 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.3;
          }
          33% {
            transform: translate(-40%, 25%) scale(1.25);
            opacity: 0.6;
          }
          66% {
            transform: translate(-70%, -20%) scale(0.85);
            opacity: 0.5;
          }
        }

        @keyframes cloudMove3 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.35;
          }
          20% {
            transform: translate(35%, -25%) scale(1.2);
            opacity: 0.6;
          }
          40% {
            transform: translate(60%, 30%) scale(0.85);
            opacity: 0.5;
          }
          60% {
            transform: translate(35%, 20%) scale(1.15);
            opacity: 0.55;
          }
          80% {
            transform: translate(-15%, -10%) scale(1.0);
            opacity: 0.45;
          }
        }

        @keyframes cloudMove4 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.4;
          }
          30% {
            transform: translate(-35%, 35%) scale(1.3);
            opacity: 0.7;
          }
          60% {
            transform: translate(-60%, -25%) scale(0.8);
            opacity: 0.4;
          }
        }

        @keyframes cloudMove5 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.3;
          }
          25% {
            transform: translate(25%, -35%) scale(1.25);
            opacity: 0.6;
          }
          50% {
            transform: translate(50%, 30%) scale(0.85);
            opacity: 0.5;
          }
          75% {
            transform: translate(25%, 15%) scale(1.15);
            opacity: 0.55;
          }
        }

        @keyframes gradientSweep {
          0% {
            background-position: 0% 0%;
          }
          50% {
            background-position: 100% 100%;
          }
          100% {
            background-position: 0% 0%;
          }
        }

        @keyframes lightGlow {
          0%, 100% {
            opacity: 0.6;
            transform: translateX(-50%) translateY(-50%) scale(1);
          }
          50% {
            opacity: 1;
            transform: translateX(-50%) translateY(-50%) scale(1.2);
          }
        }

        .hero-gradient-animate {
          background-size: 500% 500% !important;
          animation: gradientSweep 12s ease-in-out infinite;
        }

        .hero-light-glow {
          position: absolute;
          width: 200%;
          height: 200%;
          top: 50%;
          left: 50%;
          background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 30%, transparent 70%);
          transform: translateX(-50%) translateY(-50%) rotate(45deg);
          animation: lightGlow 8s ease-in-out infinite;
          pointer-events: none;
        }

      `}</style>

      {/* Navigation */}
      <nav 
        className={`fixed top-0 left-0 right-0 z-[1000] flex justify-between items-center transition-all duration-[400ms] ${
          navScrolled 
            ? 'bg-[rgba(30,60,35,0.95)] backdrop-blur-[20px] py-3 sm:py-5 px-2 sm:px-[60px] shadow-[0_10px_40px_rgba(0,0,0,0.3)]' 
            : 'bg-transparent py-4 sm:py-[30px] px-2 sm:px-[60px]'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
      >
        <div className="flex items-center gap-2 sm:gap-[15px] flex-1 min-w-0" style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '16px sm:text-[20px]', fontWeight: 700, letterSpacing: '1px', color: 'var(--light)' }}>
          <img src="/logo.png" alt="VCL Logo" className="h-8 sm:h-[50px] w-auto object-contain flex-shrink-0" />
          <div className="flex flex-col gap-[1px] sm:gap-[2px] min-w-0 flex-1">
            <span className="font-semibold leading-tight" style={{ color: 'var(--light)', letterSpacing: '0px', fontSize: 'clamp(12px, 5vw, 22px)' }}>溫哥華華人女子高爾夫俱樂部</span>
            <span className="uppercase leading-tight break-words" style={{ color: 'var(--accent)', letterSpacing: '0.2px', fontWeight: 700, fontFamily: 'sans-serif', fontSize: 'clamp(10px, 2.8vw, 13px)' }}>Vancouver Chinese Ladies' Golf Club</span>
              </div>
              </div>
        
        {/* Desktop Navigation */}
        <ul className="hidden lg:flex gap-[50px] list-none mr-8 lg:mr-12">
          <li>
            <a 
              href="#hero" 
              onClick={(e) => handleSmoothScroll(e, 'hero')}
              className="nav-link text-[14px] font-medium uppercase transition-colors duration-300 hover:text-[var(--accent)]"
              style={{ color: 'rgba(255,255,255,0.8)', letterSpacing: '1.5px', textDecoration: 'none' }}
            >
              首頁
            </a>
          </li>
          <li>
            <a 
              href="#about" 
              onClick={(e) => handleSmoothScroll(e, 'about')}
              className="nav-link text-[14px] font-medium uppercase transition-colors duration-300 hover:text-[var(--accent)]"
              style={{ color: 'rgba(255,255,255,0.8)', letterSpacing: '1.5px', textDecoration: 'none' }}
            >
              關於我們
            </a>
          </li>
          <li>
            <a 
              href="#activities" 
              onClick={(e) => handleSmoothScroll(e, 'activities')}
              className="nav-link text-[14px] font-medium uppercase transition-colors duration-300 hover:text-[var(--accent)]"
              style={{ color: 'rgba(255,255,255,0.8)', letterSpacing: '1.5px', textDecoration: 'none' }}
            >
              精彩回顾
            </a>
          </li>
          <li>
            <a 
              href="#members-gallery" 
              onClick={(e) => handleSmoothScroll(e, 'members-gallery')}
              className="nav-link text-[14px] font-medium uppercase transition-colors duration-300 hover:text-[var(--accent)]"
              style={{ color: 'rgba(255,255,255,0.8)', letterSpacing: '1.5px', textDecoration: 'none' }}
            >
              CLUB風采
            </a>
          </li>
        </ul>

        {/* Mobile Menu Button & Login */}
        <div className="flex items-center gap-2 sm:gap-4">
            {shouldShowInstallButton && (
              <button
              onClick={() => navigate('/install')}
              className="flex items-center gap-1.5 sm:gap-2 text-white hover:text-[var(--accent)] transition-colors font-medium text-xs sm:text-sm px-2 sm:px-0"
              title="安装桌面应用"
              >
              <Download className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="hidden md:inline">安装应用</span>
              </button>
            )}
            <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 text-white hover:text-[var(--accent)] transition-colors font-medium text-xs sm:text-sm"
            >
            <LogIn className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">会员登录</span>
            </button>
          
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden text-white p-2"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-[rgba(30,60,35,0.98)] backdrop-blur-[20px] border-t border-white/10 lg:hidden">
            <div className="flex flex-col py-4 px-4">
              <a 
                href="#hero" 
                onClick={(e) => {
                  handleSmoothScroll(e, 'hero')
                  setMobileMenuOpen(false)
                }}
                className="text-white py-3 px-4 hover:bg-white/10 rounded-lg transition-colors uppercase text-sm"
                style={{ letterSpacing: '1.5px' }}
              >
                首頁
              </a>
              <a 
                href="#about" 
                onClick={(e) => {
                  handleSmoothScroll(e, 'about')
                  setMobileMenuOpen(false)
                }}
                className="text-white py-3 px-4 hover:bg-white/10 rounded-lg transition-colors uppercase text-sm"
                style={{ letterSpacing: '1.5px' }}
              >
                關於我們
              </a>
              <a 
                href="#activities" 
                onClick={(e) => {
                  handleSmoothScroll(e, 'activities')
                  setMobileMenuOpen(false)
                }}
                className="text-white py-3 px-4 hover:bg-white/10 rounded-lg transition-colors text-sm"
              >
                精彩回顾
              </a>
              <a 
                href="#members-gallery" 
                onClick={(e) => {
                  handleSmoothScroll(e, 'members-gallery')
                  setMobileMenuOpen(false)
                }}
                className="text-white py-3 px-4 hover:bg-white/10 rounded-lg transition-colors text-sm"
              >
                CLUB風采
              </a>
                {shouldShowInstallButton && (
                  <button
                    onClick={() => {
                    navigate('/install')
                    setMobileMenuOpen(false)
                    }}
                  className="flex items-center justify-center gap-2 mt-2 px-4 py-2 text-white hover:text-[var(--accent)] transition-colors font-medium text-sm"
                  >
                  <Download className="w-4 h-4" />
                  <span>安装应用</span>
                  </button>
                )}
                <button
                  onClick={() => {
                  navigate('/login')
                  setMobileMenuOpen(false)
                  }}
                className="flex items-center justify-center gap-2 mt-2 px-4 py-2 text-white hover:text-[var(--accent)] transition-colors font-medium text-sm"
                >
                <LogIn className="w-4 h-4" />
                <span>会员登录</span>
                </button>
              </div>
            </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="hero" className="relative h-screen flex items-center overflow-hidden pt-16 sm:pt-0">
        <div 
          className="absolute inset-0 w-full h-full bg-cover"
          style={{ 
            backgroundImage: 'url(/hero_photo.jpg)',
            backgroundPosition: isMobile ? '35% center' : 'center center'
          }}
        >
          {/* 主光影渐变层 */}
          <div 
            className="absolute inset-0 hero-gradient-animate"
          style={{
              background: 'linear-gradient(45deg, rgba(20, 20, 20, 0.92) 0%, rgba(20, 20, 20, 0.85) 12%, rgba(20, 20, 20, 0.65) 25%, rgba(20, 20, 20, 0.35) 40%, rgba(20, 20, 20, 0.1) 48%, rgba(20, 20, 20, 0.05) 50%, rgba(20, 20, 20, 0.1) 52%, rgba(20, 20, 20, 0.35) 60%, rgba(20, 20, 20, 0.65) 75%, rgba(20, 20, 20, 0.85) 88%, rgba(20, 20, 20, 0.92) 100%)'
            }}
          />
          {/* 光晕层 */}
          <div className="hero-light-glow" />
          {/* 顶部高光层 */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.05) 100%)',
              mixBlendMode: 'overlay'
            }}
          />
              </div>
              
        <div className="relative z-[2] max-w-[1400px] mx-auto px-8 sm:px-8 lg:px-[60px] w-full flex flex-col items-start pt-[154px] sm:pt-24">
          <h1 
            className="font-light leading-[1.3] mb-6 sm:mb-10 opacity-0 animate-fade-in-delay max-w-[900px]"
            style={{ 
              fontFamily: '"Cormorant Garamond", serif', 
              fontSize: 'clamp(36px, 7vw, 60px)',
              color: '#fff'
            }}
          >
            歡迎來到<br />
            <strong className="font-bold block whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: 'var(--primary)', fontSize: 'clamp(24px, 6.4vw, 60px)' }}>
            溫哥華華人女子高爾夫俱樂部
            </strong>
          </h1>
          <p 
            className="text-base sm:text-base lg:text-xl leading-[1.8] max-w-[600px] mb-6 sm:mb-[50px] font-light opacity-0 animate-fade-in-delay"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          >
            匯聚熱愛高爾夫的華人女性，在綠茵場上揮灑激情
            <br className="hidden sm:block" />
            讓熱愛連結彼此，共享無限歡樂與真摯友誼
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-[25px] w-full sm:w-auto opacity-0 animate-fade-in-delay">
            <a 
              href="#about" 
              onClick={(e) => handleSmoothScroll(e, 'about')}
              className="px-6 sm:px-[45px] py-3 sm:py-[18px] text-sm sm:text-sm font-semibold uppercase transition-all duration-[400ms] relative overflow-hidden text-center hero-btn-primary"
              style={{ 
                background: 'linear-gradient(135deg, var(--accent), var(--pink))',
                color: 'white',
                textDecoration: 'none',
                transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <span className="relative z-[1]">關於我們</span>
            </a>
            <a 
              href="#activities" 
              onClick={(e) => handleSmoothScroll(e, 'activities')}
              className="px-6 sm:px-[45px] py-3 sm:py-[18px] text-sm sm:text-sm font-semibold uppercase text-center hero-btn-secondary"
              style={{ 
                background: 'transparent',
                color: '#fff !important',
                border: '1px solid rgba(255,255,255,0.3)',
                textDecoration: 'none',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)'
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'
                e.currentTarget.style.color = '#fff'
              }}
            >
              <span style={{ color: '#fff' }}>精彩回顧</span>
            </a>
              </div>
            </div>

        <div className="absolute bottom-8 sm:bottom-[60px] left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 sm:gap-[15px] text-[10px] sm:text-xs uppercase animate-float hidden sm:flex" style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '2px' }}>
          <span>Scroll</span>
          <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
      </section>

      {/* About Section */}
      <section id="about" className="relative pt-[100px] pb-[120px] sm:pt-[100px] sm:pb-[140px] lg:pt-[180px] lg:pb-[200px] px-5 sm:px-[30px] lg:px-[60px]" style={{ background: 'var(--light)', color: 'var(--dark)' }}>
        <div className="max-w-[1400px] mx-auto px-7 sm:px-0 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-12 lg:gap-[100px] items-center">
          <div 
            ref={aboutTextRef}
            data-animate-id="about-text"
            className={`pr-0 md:pr-[60px] py-32 sm:py-40 lg:py-48 scroll-animate-left ${visibleElements.has('about-text') ? 'scroll-animate-visible' : ''}`}
          >
            <div className="text-sm sm:text-sm uppercase mb-4 sm:mb-[25px] font-semibold" style={{ letterSpacing: '3px', color: 'var(--accent)' }}>
              About VCL Golf Club
                    </div>
            {/* 主标题 */}
            <h2 
              className="font-light leading-[1.3] mb-4 sm:mb-6 text-4xl sm:text-5xl lg:text-[64px]"
              style={{ fontFamily: '"Cormorant Garamond", serif', color: 'var(--dark)' }}
            >
              <span className="block">
                揮桿<strong className="font-bold" style={{ color: 'var(--primary)' }}>溫哥華</strong>，悅享高
              </span>
              <span className="block">球人生</span>
            </h2>
            
            {/* 分隔线 */}
            <div className="mb-4 sm:mb-6">
              <div className="w-16 sm:w-24 h-px bg-[#888]" style={{ opacity: 0.3 }}></div>
            </div>
            
            {/* 副标题 */}
            <div 
              className="text-xl sm:text-2xl lg:text-3xl font-light leading-[1.6] mb-6 sm:mb-10"
              style={{ fontFamily: '"Cormorant Garamond", serif', color: '#666' }}
            >
              <span className="block">每一個優雅瞬</span>
              <span className="block">間，都有<strong className="font-semibold" style={{ color: 'var(--primary)' }}>VCL</strong>的陪</span>
              <span className="block">伴</span>
            </div>
            <p className="text-base sm:text-base lg:text-lg leading-[1.9] text-[#666] mb-4 sm:mb-[30px] font-light">
            溫哥華華人女子高爾夫俱樂部（VCL）成立於 <strong className="font-semibold">2016 年</strong>。VCL 不僅僅是一個公益性的運動組織，更是一個充滿溫情的華人女性大家庭。我們匯聚了來自五湖四海、定居溫哥華的女性高球愛好者，透過共同的熱愛，在這裡收穫成長、友誼與快樂。
            </p>
            <p className="text-base sm:text-base lg:text-lg leading-[1.9] text-[#666] mb-4 sm:mb-[30px] font-light">
            「在 VCL，高爾夫不僅是競技，更是一種連結彼此的紐帶。」我們相信，每一次完美的揮桿背後，都是對生活的熱愛；每一次果嶺上的握手，都是一段珍貴友誼的開始。
            </p>

            {/* VCL 球會特色 */}
            <div className="mt-8 sm:mt-[50px]">
              <p className="text-base sm:text-base lg:text-lg leading-[1.9] text-[#666] mb-4 sm:mb-[30px] font-light">
                <span className="text-2xl sm:text-3xl mr-2">🌟</span> VCL 俱樂部特色
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                {/* 溫情大家庭 */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1" style={{ color: 'var(--primary)' }}>
                    <Heart className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <p className="text-base sm:text-base lg:text-lg leading-[1.9] text-[#666] font-light flex-1">
                    <strong className="font-semibold text-[#333]">【溫情大家庭】</strong>我們致力於營造一個包容、互助的氛圍。無論您是初試身手的球場新人，還是經驗豐富的資深球手，都能在這個平台上找到志同道合的朋友，共同進步，告別孤獨揮桿。
                  </p>
                </div>

                {/* 專業與禮儀 */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1" style={{ color: 'var(--primary)' }}>
                    <Trophy className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <p className="text-base sm:text-base lg:text-lg leading-[1.9] text-[#666] font-light flex-1">
                    <strong className="font-semibold text-[#333]">【專業與禮儀】</strong>作為 <strong className="font-semibold">BC Golf</strong> 正式註冊俱樂部，我們倡導優雅的運動精神。通過普及學習規則與禮儀，我們不斷提升個人修養，確保每一位 VCL 會員在球場上都能展現出<strong className="font-semibold">懂規則、自信且知禮</strong>的高爾夫風采。
                  </p>
                </div>

                {/* 精彩賽季活動 */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1" style={{ color: 'var(--primary)' }}>
                    <Calendar className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <p className="text-base sm:text-base lg:text-lg leading-[1.9] text-[#666] font-light flex-1">
                    <strong className="font-semibold text-[#333]">【精彩賽季活動】</strong>每逢高爾夫賽季，我們每月都會策劃豐富多彩的球聚：從嚴謹的俱樂部賽事到輕鬆的聯誼聚會，讓大家在繁忙的生活之餘，盡情享受大自然的陽光與空氣。
                  </p>
                </div>

                {/* 競技與成長 */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1" style={{ color: 'var(--primary)' }}>
                    <Target className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <p className="text-base sm:text-base lg:text-lg leading-[1.9] text-[#666] font-light flex-1">
                    <strong className="font-semibold text-[#333]">【競技與成長】</strong>我們積極鼓勵會員走出「舒適區」，參與本地各類高爾夫比賽。在競技中挑戰自我，在挑戰中突破極限，在球場的綠茵間展示真實的自我。
                  </p>
                </div>
              </div>

              {/* 結尾段落 */}
              <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-[#ddd]">
                <p className="text-base sm:text-base lg:text-lg leading-[1.9] text-[#666] mb-4 sm:mb-[30px] font-light">
                  加入我們，不只是高爾夫
                </p>
                <p className="text-base sm:text-base lg:text-lg leading-[1.9] text-[#666] mb-4 sm:mb-[30px] font-light">
                  在這裡，我們分享揮桿的技巧，更分享生活的點滴。我們邀請每一位熱愛生活、渴望友誼的華人女性加入 VCL。
                </p>
                <p className="text-base sm:text-base lg:text-lg leading-[1.9] text-[#666] mb-4 sm:mb-[30px] font-light">
                  讓我們在溫哥華的藍天綠草間，一起揮出快樂，收穫友誼，活出最精彩的自己！
                </p>
              </div>
            </div>
              </div>

          <div 
            ref={aboutImageRef}
            data-animate-id="about-image"
            className={`relative h-[400px] sm:h-[500px] lg:h-[700px] mt-0 md:mt-0 scroll-animate-right ${visibleElements.has('about-image') ? 'scroll-animate-visible' : ''}`}
          >
            <img
              src="https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?q=80&w=2070"
              alt="Golf Course"
              className="w-full h-full object-cover rounded-lg"
            />
                      </div>
                  </div>
      </section>

      {/* Activities Section */}
      <section id="activities" className="relative py-24 sm:py-32 lg:py-40 px-8 sm:px-8 lg:px-[60px] overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(25, 55, 30, 0.95) 0%, rgba(50, 100, 60, 0.95) 50%, rgba(30, 60, 35, 0.95) 100%)' }}>
        {/* 背景装饰图案 */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          {/* 高尔夫球图案 */}
          <div className="absolute top-10 left-10 w-20 h-20 rounded-full border-2 border-white/20"></div>
          <div className="absolute top-32 right-20 w-16 h-16 rounded-full border-2 border-white/20"></div>
          <div className="absolute bottom-20 left-1/4 w-24 h-24 rounded-full border-2 border-white/20"></div>
          <div className="absolute top-1/2 right-1/3 w-16 h-16 rounded-full border-2 border-white/20"></div>
          
          {/* 球洞图案 */}
          <div className="absolute top-20 right-1/4 w-8 h-8 rounded-full bg-white/10"></div>
          <div className="absolute bottom-32 left-1/3 w-6 h-6 rounded-full bg-white/10"></div>
          <div className="absolute top-2/3 right-10 w-10 h-10 rounded-full bg-white/10"></div>
          
          {/* 装饰线条 */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                      </div>
        <div 
          ref={activitiesTitleRef}
          data-animate-id="activities-title"
          className={`relative z-10 max-w-[1400px] mx-auto mb-12 sm:mb-20 text-center scroll-animate-up ${visibleElements.has('activities-title') ? 'scroll-animate-visible' : ''}`}
        >
          <div className="text-sm sm:text-sm uppercase mb-4 sm:mb-[25px] font-semibold" style={{ letterSpacing: '3px', color: 'var(--accent)' }}>
            Recent Highlights
                      </div>
          <h2 
            className="font-light leading-[1.2] mb-6 sm:mb-10 text-white text-4xl sm:text-5xl lg:text-[64px]"
            style={{ fontFamily: '"Cormorant Garamond", serif' }}
          >
            精彩<strong className="font-bold" style={{ color: 'var(--accent)' }}>活動回顧</strong>
          </h2>
                    </div>

        <div className="relative z-10 max-w-[1400px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
          {loading ? (
            <div className="col-span-3 text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
        </div>
          ) : events.length > 0 ? (
            events.map((event, idx) => (
                <div
                  key={event.id}
                  data-animate-id={`activity-${event.id}`}
                  className={`activity-card relative overflow-hidden rounded-lg cursor-pointer scroll-animate-up shadow-lg hover:shadow-xl transition-shadow duration-300 ${visibleElements.has(`activity-${event.id}`) ? 'scroll-animate-visible' : ''}`}
                  style={{ aspectRatio: '4/5', transitionDelay: `${idx * 0.1}s`, boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)' }}
                  onClick={() => navigate(`/review/${event.id}`)}
                >
                      <img
                  src={event.article_featured_image_url || event.image_url || activityImages[idx]?.src}
                        alt={event.title}
                  className="w-full h-full object-cover"
                />
                <div 
                  className="activity-overlay absolute inset-0 flex flex-col justify-end transition-all duration-400"
                  style={{
                    background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent 60%)',
                    padding: '40px'
                  }}
                >
                <div>
                    <div className="text-[13px] uppercase mb-[15px]" style={{ letterSpacing: '2px', color: 'var(--pink)', fontWeight: 500 }}>
                      {formatEventDateInTimezone(event.start_time, 'en-US')}
                </div>
                    <h3 
                      className="mb-3 leading-[1.3] text-white"
                      style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '24px', fontWeight: 600 }}
                    >
                      {event.title}
                    </h3>
                    <div className="flex gap-[25px] text-[13px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      <span className="flex items-center">
                        <i className="fas fa-map-marker-alt mr-2" style={{ color: 'var(--primary)', fontSize: '16px' }}></i>
                        {event.location}
                      </span>
                      <span className="flex items-center">
                        <i className="fas fa-users mr-2" style={{ color: 'var(--primary)', fontSize: '16px' }}></i>
                        {event.max_participants}
                      </span>
              </div>
                </div>
              </div>
                  </div>
            ))
          ) : (
            <div className="col-span-3 text-center py-16 sm:py-20">
              <div className="flex flex-col items-center justify-center">
                <div className="mb-6">
                  <Calendar className="w-16 h-16 sm:w-20 sm:h-20 mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }} />
                </div>
                <h3 
                  className="text-xl sm:text-2xl mb-3 text-white"
                  style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 600 }}
                >
                  暂无活动回顾
                </h3>
                <p className="text-sm sm:text-base" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  精彩活动即将到来，敬请期待
                </p>
              </div>
            </div>
                            )}
                          </div>
                          
        <div className="text-center mt-12 sm:mt-20 hidden">
          <button
            onClick={() => navigate('/login')}
            className="px-6 sm:px-[45px] py-3 sm:py-[18px] text-xs sm:text-sm font-semibold uppercase transition-all duration-[400ms]"
            style={{ 
              background: 'transparent',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)',
              textDecoration: 'none'
            }}
          >
            <span>View All Events</span>
          </button>
                            </div>
      </section>

      {/* Members Gallery Section */}
      <section id="members-gallery" className="relative overflow-hidden py-24 sm:py-32 lg:py-40 px-8 sm:px-8 lg:px-[60px]" style={{ background: 'linear-gradient(135deg, #fef5f8 0%, #fef9f5 50%, #fff5f8 100%)' }}>
        {/* 粉色云朵流动动画背景 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* 云朵1 */}
          <div className="absolute rounded-full" style={{
            width: '400px',
            height: '300px',
            background: 'radial-gradient(ellipse, rgba(236, 64, 122, 0.3) 0%, rgba(236, 64, 122, 0.1) 50%, transparent 100%)',
            filter: 'blur(60px)',
            top: '10%',
            left: '-10%',
            animation: 'cloudMove1 8s ease-in-out infinite'
          }}></div>
          {/* 云朵2 */}
          <div className="absolute rounded-full" style={{
            width: '500px',
            height: '400px',
            background: 'radial-gradient(ellipse, rgba(255, 80, 158, 0.25) 0%, rgba(255, 80, 158, 0.1) 50%, transparent 100%)',
            filter: 'blur(80px)',
            top: '30%',
            right: '-15%',
            animation: 'cloudMove2 10s ease-in-out infinite 1s'
          }}></div>
          {/* 云朵3 */}
          <div className="absolute rounded-full" style={{
            width: '450px',
            height: '350px',
            background: 'radial-gradient(ellipse, rgba(236, 64, 122, 0.2) 0%, rgba(236, 64, 122, 0.05) 50%, transparent 100%)',
            filter: 'blur(70px)',
            bottom: '20%',
            left: '20%',
            animation: 'cloudMove3 9s ease-in-out infinite 2s'
          }}></div>
          {/* 云朵4 */}
          <div className="absolute rounded-full" style={{
            width: '380px',
            height: '320px',
            background: 'radial-gradient(ellipse, rgba(255, 80, 158, 0.2) 0%, rgba(255, 80, 158, 0.08) 50%, transparent 100%)',
            filter: 'blur(65px)',
            top: '50%',
            right: '10%',
            animation: 'cloudMove4 7s ease-in-out infinite 0.5s'
          }}></div>
          {/* 云朵5 */}
          <div className="absolute rounded-full" style={{
            width: '420px',
            height: '380px',
            background: 'radial-gradient(ellipse, rgba(236, 64, 122, 0.15) 0%, rgba(236, 64, 122, 0.05) 50%, transparent 100%)',
            filter: 'blur(75px)',
            bottom: '10%',
            right: '30%',
            animation: 'cloudMove5 9s ease-in-out infinite 1.5s'
          }}></div>
                            </div>
                            
        <div className="relative z-10 max-w-[1400px] mx-auto">
          <div 
            ref={galleryTitleRef}
            data-animate-id="gallery-title"
            className={`text-center mb-12 sm:mb-20 scroll-animate-up ${visibleElements.has('gallery-title') ? 'scroll-animate-visible' : ''}`}
          >
            <div className="text-sm sm:text-sm uppercase mb-4 sm:mb-[25px] font-semibold" style={{ letterSpacing: '3px', color: 'var(--accent)' }}>
              Members Moments
                                    </div>
            <h2 
              className="font-light leading-[1.2] mb-6 sm:mb-10 text-4xl sm:text-5xl lg:text-[64px]"
              style={{ fontFamily: '"Cormorant Garamond", serif', color: 'var(--dark)' }}
            >
              CLUB<strong className="font-bold" style={{ color: 'var(--primary)' }}>風采</strong>
            </h2>
            <p className="text-base sm:text-base lg:text-lg text-[#666] px-4">
              記錄每一個精彩瞬間，分享高爾夫的快樂時光
            </p>
                                </div>

          {/* Main Image Display */}
          <div className="relative overflow-hidden mb-6 sm:mb-8 bg-transparent" style={{ padding: '20px 0 sm:40px 0', height: windowWidth <= 768 ? '300px' : windowWidth <= 1024 ? '400px' : '500px', backgroundColor: 'transparent' }}>
            <div 
              ref={carouselTrackRef}
              className="flex gap-4 sm:gap-[30px] bg-transparent"
              style={{ 
                transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                willChange: 'transform',
                backgroundColor: 'transparent'
              }}
            >
              {/* Duplicate images for seamless loop */}
              {[...galleryImages, ...galleryImages].map((img, idx) => {
                // 计算实际图片索引（因为图片被复制了，需要取模）
                const actualIndex = idx % galleryImages.length
                return (
                  <div
                    key={idx}
                    className="flex-shrink-0 rounded-2xl overflow-hidden relative bg-transparent cursor-pointer group"
                    style={{ 
                      width: windowWidth <= 768 ? 'calc(100vw - 80px)' : windowWidth <= 1024 ? 'calc((100vw - 120px) / 2)' : 'calc((100vw - 240px) / 3)',
                      height: windowWidth <= 768 ? '300px' : windowWidth <= 1024 ? '400px' : '500px',
                      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
                      backgroundColor: 'transparent'
                    }}
                    onClick={() => {
                      setLightboxIndex(actualIndex)
                      setLightboxOpen(true)
                    }}
                  >
                    <img
                      src={img}
                      alt="Golf moment"
                      className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                    />
                    {/* 放大图标提示 */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <ZoomIn className="w-12 h-12 text-white" />
                    </div>
                  </div>
                )
              })}
                                            </div>
                                      </div>

          {/* Thumbnail Gallery */}
          <div className="flex justify-center gap-2 sm:gap-3 overflow-x-auto pt-2 pb-2 px-4 bg-transparent" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', backgroundColor: 'transparent' }}>
            <style>{`
              .thumbnail-scroll::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            <div className="flex gap-2 sm:gap-3 thumbnail-scroll py-1">
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => goToIndex(idx)}
                  className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-300 cursor-pointer ${
                    idx === carouselIndex 
                      ? 'border-[var(--accent)] scale-110 shadow-lg' 
                      : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'
                  }`}
                  style={{
                    width: windowWidth <= 768 ? '60px' : windowWidth <= 1024 ? '80px' : '100px',
                    height: windowWidth <= 768 ? '60px' : windowWidth <= 1024 ? '80px' : '100px'
                  }}
                  onDoubleClick={() => {
                    setLightboxIndex(idx)
                    setLightboxOpen(true)
                  }}
                >
                  <img
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </button>
              ))}
                                </div>
                              </div>
                          </div>
      </section>

      {/* Lightbox Modal - 全屏图片查看 */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 z-[2000] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          {/* 关闭按钮 */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 sm:top-8 sm:right-8 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="关闭"
          >
            <X className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </button>

          {/* 上一张按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setLightboxIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length)
            }}
            className="absolute left-4 sm:left-8 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="上一张"
          >
            <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </button>

          {/* 下一张按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setLightboxIndex((prev) => (prev + 1) % galleryImages.length)
            }}
            className="absolute right-4 sm:right-8 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="下一张"
          >
            <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </button>

          {/* 图片容器 */}
          <div 
            className="relative w-full h-full flex items-center justify-center overflow-hidden"
            onClick={(e) => {
              e.stopPropagation()
              if (scale === 1) {
                setLightboxOpen(false)
              }
            }}
            onTouchStart={handleImageTouchStart}
            onTouchMove={handleImageTouchMove}
            onTouchEnd={handleImageTouchEnd}
          >
            <img
              ref={imageRef}
              src={galleryImages[lightboxIndex]}
              alt={`Gallery image ${lightboxIndex + 1}`}
              className="max-w-full max-h-[95vh] w-auto h-auto object-contain rounded-lg shadow-2xl select-none"
              style={{
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                transformOrigin: 'center center',
                willChange: 'transform',
                transition: scale === 1 ? 'transform 0.2s ease-out' : 'none',
                touchAction: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none',
                WebkitTouchCallout: 'none',
                cursor: scale > 1 ? 'move' : 'default'
              }}
              onDoubleClick={handleDoubleClick}
              draggable={false}
            />
            
            {/* 图片索引指示器 */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm">
              {lightboxIndex + 1} / {galleryImages.length}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative overflow-hidden" style={{ background: '#0f0f0f', color: 'rgba(255,255,255,0.7)' }}>
        <div className="max-w-[1400px] mx-auto px-8 sm:px-8 lg:px-[60px] pt-16 sm:pt-20 lg:pt-24 pb-6 sm:pb-8 lg:pb-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 sm:gap-16 lg:gap-20 mb-12 sm:mb-16 lg:mb-20">
            {/* Left Column - About */}
            <div className="flex flex-col">
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
                <img src="/logo.png" alt="VCL Logo" className="h-12 sm:h-14 w-auto" />
                <div className="flex flex-col gap-1">
                  <span className="text-sm sm:text-base font-medium" style={{ color: 'var(--primary)' }}>溫哥華華人女子高爾夫俱樂部</span>
                  <span className="text-[10px] sm:text-xs uppercase" style={{ color: 'rgba(255,255,255,0.8)', letterSpacing: '1px' }}>Vancouver Chinese Ladies' Golf Club</span>
                              </div>
                          </div>
              <p className="text-sm sm:text-[15px] leading-[1.8] mb-6 sm:mb-8" style={{ color: 'rgba(255,255,255,0.7)' }}>
                致力於為熱愛高爾夫的女性打造專屬平台，在優雅運動中建立終身友誼。
              </p>
              <div className="flex gap-3 sm:gap-4">
                {[
                  { name: 'WeChat', icon: 'fab fa-weixin', href: '#' },
                  { name: 'Instagram', icon: 'fab fa-instagram', href: '#' },
                  { name: 'Facebook', icon: 'fab fa-facebook-f', href: 'https://www.facebook.com/VCLgolfclub' },
                  { name: 'YouTube', icon: 'fab fa-youtube', href: '#' }
                ].map((social, idx) => (
                  <a
                    key={idx}
                    href={social.href}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-white/20 flex items-center justify-center transition-all duration-300 hover:border-[var(--accent)] hover:text-[var(--accent)] hover:-translate-y-1"
                    style={{ color: 'rgba(255,255,255,0.8)' }}
                    aria-label={social.name}
                  >
                    <i className={social.icon} style={{ fontSize: '18px' }}></i>
                  </a>
                ))}
                        </div>
                      </div>

            {/* Middle Column - Contact */}
            <div className="flex flex-col">
              <h4 className="text-base sm:text-lg font-semibold text-white mb-5 sm:mb-6 uppercase" style={{ letterSpacing: '1px' }}>聯繫我們</h4>
              <div className="space-y-4 sm:space-y-5">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--primary)' }} />
                  <div className="text-sm sm:text-[15px] leading-[1.6]" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Vancouver, BC<br />Canada
                    </div>
                  </div>
                <div className="flex items-start gap-3">
                  <span className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0 text-center" style={{ color: 'var(--primary)', fontSize: '14px sm:text-base' }}>@</span>
                  <span className="text-sm sm:text-[15px] leading-[1.6]" style={{ color: 'rgba(255,255,255,0.8)' }}>vclgolfclub@hotmail.com</span>
                  </div>
                <div className="flex items-start gap-3">
                  <span className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0 text-center" style={{ color: 'var(--primary)', fontSize: '14px sm:text-base' }}>💬</span>
                  <span className="text-sm sm:text-[15px] leading-[1.6]" style={{ color: 'rgba(255,255,255,0.8)' }}>微信 13817862041</span>
                </div>
            </div>
          </div>

            {/* Right Column - QR Code */}
            <div className="flex flex-col items-start md:items-center justify-start">
              <img 
                src="/vcl_QR_code.png" 
                alt="VCL QR Code" 
                className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 object-contain rounded-lg border border-white/10"
              />
              <p className="text-sm sm:text-base mt-3 text-center" style={{ color: 'rgba(255,255,255,0.8)' }}>
                微信公眾號
              </p>
            </div>
        </div>

          {/* Bottom Section - Copyright and Legal */}
          <div className="border-t border-white/10 pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs sm:text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <p>&copy; 2025 VCL Golf Club. All rights reserved.</p>
            <div className="flex gap-2">
              <a href="#" className="text-[var(--accent)] no-underline hover:text-[var(--pink)] transition-colors">Privacy Policy</a>
              <span className="text-[var(--accent)]">·</span>
              <a href="#" className="text-[var(--accent)] no-underline hover:text-[var(--pink)] transition-colors">Terms of Service</a>
          </div>
            </div>
        </div>
      </footer>
    </div>
  )
}
