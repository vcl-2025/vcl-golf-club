import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ChevronDown, MapPin, Users, Trophy, Calendar, Star, LogIn, Menu, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Event } from '../types'

export default function HomePage() {
  const navigate = useNavigate()
  const [navScrolled, setNavScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)
  const carouselTrackRef = useRef<HTMLDivElement>(null)
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  
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
    'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?q=80&w=2070',
    'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?q=80&w=2070',
    'https://images.unsplash.com/photo-1592919505780-303950717480?q=80&w=2070',
    'https://images.unsplash.com/photo-1530028828-25e8270d5d0a?q=80&w=2070',
    'https://images.unsplash.com/photo-1596727362302-b8d891c42ab8?q=80&w=2070',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=2070'
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
    }

    window.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

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

  useEffect(() => {
    // Carousel auto scroll
    const startAutoScroll = () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current)
      }
      autoScrollIntervalRef.current = setInterval(() => {
        nextSlide()
      }, 3000)
    }

    startAutoScroll()
    return () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current)
      }
    }
  }, [carouselIndex])

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

  const updateCarousel = (newIndex: number) => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setCarouselIndex(newIndex)
    
    if (carouselTrackRef.current) {
      const itemWidth = carouselTrackRef.current.children[0]?.clientWidth || 0
      const gap = 30
      const offset = -(newIndex * (itemWidth + gap))
      carouselTrackRef.current.style.transform = `translateX(${offset}px)`
    }

    setTimeout(() => {
      setIsTransitioning(false)
    }, 600)
  }

  const nextSlide = () => {
    const newIndex = carouselIndex >= maxIndex ? 0 : carouselIndex + 1
    updateCarousel(newIndex)
  }

  const prevSlide = () => {
    const newIndex = carouselIndex <= 0 ? maxIndex : carouselIndex - 1
    updateCarousel(newIndex)
  }

  const goToIndex = (index: number) => {
    updateCarousel(index)
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

      `}</style>

      {/* Navigation */}
      <nav 
        className={`fixed top-0 left-0 right-0 z-[1000] flex justify-between items-center transition-all duration-[400ms] ${
          navScrolled 
            ? 'bg-[rgba(30,60,35,0.95)] backdrop-blur-[20px] py-3 sm:py-5 px-4 sm:px-[60px] shadow-[0_10px_40px_rgba(0,0,0,0.3)]' 
            : 'bg-transparent py-4 sm:py-[30px] px-4 sm:px-[60px]'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
      >
        <div className="flex items-center gap-2 sm:gap-[15px]" style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '16px sm:text-[20px]', fontWeight: 700, letterSpacing: '1px', color: 'var(--light)' }}>
          <img src="/vcl_sample/logo.png" alt="VCL Logo" className="h-8 sm:h-[50px] w-auto object-contain" />
          <div className="flex flex-col gap-[1px] sm:gap-[2px]">
            <span className="text-lg sm:text-[22px] font-semibold leading-tight" style={{ color: 'var(--light)', letterSpacing: '1px' }}>溫哥華華人女子高爾夫俱樂部</span>
            <span className="text-[10px] sm:text-[11px] uppercase leading-tight" style={{ color: 'var(--accent)', letterSpacing: '1.5px', fontWeight: 400 }}>Vancouver Chinese Women's Golf Club</span>
              </div>
              </div>
        
        {/* Desktop Navigation */}
        <ul className="hidden lg:flex gap-[50px] list-none">
          <li>
            <a 
              href="#hero" 
              onClick={(e) => handleSmoothScroll(e, 'hero')}
              className="nav-link text-[14px] font-medium uppercase transition-colors duration-300 hover:text-[var(--accent)]"
              style={{ color: 'rgba(255,255,255,0.8)', letterSpacing: '1.5px', textDecoration: 'none' }}
            >
              Home
            </a>
          </li>
          <li>
            <a 
              href="#about" 
              onClick={(e) => handleSmoothScroll(e, 'about')}
              className="nav-link text-[14px] font-medium uppercase transition-colors duration-300 hover:text-[var(--accent)]"
              style={{ color: 'rgba(255,255,255,0.8)', letterSpacing: '1.5px', textDecoration: 'none' }}
            >
              About Us
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
        </ul>

        {/* Mobile Menu Button & Login */}
        <div className="flex items-center gap-2 sm:gap-4">
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
                Home
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
                About Us
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
          className="absolute inset-0 w-full h-full bg-cover bg-center"
          style={{ backgroundImage: 'url(/vcl_sample/hero_photo.jpg)' }}
        >
          <div 
            className="absolute inset-0"
          style={{
              background: 'linear-gradient(to right, rgba(26, 26, 26, 0.85) 0%, rgba(26, 26, 26, 0.6) 50%, rgba(26, 26, 26, 0.3) 100%)'
            }}
          />
              </div>
              
        <div className="relative z-[2] max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-[60px] w-full flex flex-col items-start">
          <div className="text-xs sm:text-base uppercase mb-4 sm:mb-[30px] font-medium opacity-0 animate-fade-in" style={{ letterSpacing: '4px', color: 'var(--accent)' }}>
            Vancouver Chinese Ladies' Golf Club
          </div>
          <h1 
            className="font-light leading-[1.3] mb-6 sm:mb-10 opacity-0 animate-fade-in-delay max-w-[900px]"
            style={{ 
              fontFamily: '"Cormorant Garamond", serif', 
              fontSize: 'clamp(28px, 6vw, 60px)',
              color: '#fff'
            }}
          >
            歡迎來到<br />
            <strong className="font-bold block" style={{ background: 'linear-gradient(135deg, var(--accent), var(--pink))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              溫哥華華人女子高爾夫俱樂部
            </strong>
          </h1>
          <p 
            className="text-sm sm:text-base lg:text-xl leading-[1.8] max-w-[600px] mb-6 sm:mb-[50px] font-light opacity-0 animate-fade-in-delay"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          >
            汇聚温哥华优雅女性，在世界级球场挥洒激情，<br className="hidden sm:block" />
            享受高尔夫运动的至臻体验
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-[25px] w-full sm:w-auto opacity-0 animate-fade-in-delay">
            <a 
              href="#about" 
              onClick={(e) => handleSmoothScroll(e, 'about')}
              className="px-6 sm:px-[45px] py-3 sm:py-[18px] text-xs sm:text-sm font-semibold uppercase transition-all duration-[400ms] relative overflow-hidden text-center"
              style={{ 
                background: 'linear-gradient(135deg, var(--accent), var(--pink))',
                color: 'white',
                textDecoration: 'none',
                transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <span className="relative z-[1]">About Us</span>
            </a>
            <a 
              href="#activities" 
              onClick={(e) => handleSmoothScroll(e, 'activities')}
              className="px-6 sm:px-[45px] py-3 sm:py-[18px] text-xs sm:text-sm font-semibold uppercase transition-all duration-[400ms] text-center"
              style={{ 
                background: 'transparent',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                textDecoration: 'none'
              }}
            >
              <span>精彩回顧</span>
            </a>
              </div>
            </div>

        <div className="absolute bottom-8 sm:bottom-[60px] left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 sm:gap-[15px] text-[10px] sm:text-xs uppercase animate-float hidden sm:flex" style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '2px' }}>
          <span>Scroll</span>
          <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
      </section>

      {/* About Section */}
      <section id="about" className="relative" style={{ background: 'var(--light)', color: 'var(--dark)', padding: '100px 20px sm:100px 30px lg:180px 60px' }}>
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-[100px] items-center">
          <div 
            ref={aboutTextRef}
            data-animate-id="about-text"
            className={`pr-0 md:pr-[60px] py-32 sm:py-40 lg:py-48 scroll-animate-left ${visibleElements.has('about-text') ? 'scroll-animate-visible' : ''}`}
          >
            <div className="text-xs sm:text-sm uppercase mb-4 sm:mb-[25px] font-semibold" style={{ letterSpacing: '3px', color: 'var(--accent)' }}>
              About VCL Golf Club
                    </div>
            <h2 
              className="font-light leading-[1.2] mb-6 sm:mb-10 text-3xl sm:text-5xl lg:text-[64px]"
              style={{ fontFamily: '"Cormorant Garamond", serif' }}
            >
              煥發女性 <strong className="font-bold" style={{ color: 'var(--primary)' }}>高爾夫</strong><br />的优雅与激情
            </h2>
            <p className="text-sm sm:text-base lg:text-lg leading-[1.9] text-[#666] mb-4 sm:mb-[30px] font-light">
              溫哥華華人女子高爾夫俱樂部，致力於為熱愛高爾夫的女性打造專屬平台。我們不僅提供世界級的球場資源，更創造了一個充滿活力、優雅精緻的社交圈層。
            </p>
            <p className="text-sm sm:text-base lg:text-lg leading-[1.9] text-[#666] mb-4 sm:mb-[30px] font-light">
              無論您是初學者還是資深球手，在這裡都能找到志同道合的夥伴，在綠茵場上揮灑激情，在交流中收穫友誼與成長。
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-[35px] mt-8 sm:mt-[50px]">
              {[
                { icon: Trophy, title: 'Professional Training', desc: '頂級教練團隊，量身定制訓練計劃' },
                { icon: Users, title: 'Exclusive Community', desc: '匯聚精英女性，建立高端社交網絡' },
                { icon: Calendar, title: 'Regular Events', desc: '精彩賽事活動，展現優雅球技' },
                { icon: Star, title: 'Premium Benefits', desc: '專享會員福利，尊享貴賓體驗' }
              ].map((feature, idx) => (
                <div key={idx} className="flex items-start gap-5">
                  <div className="text-[32px] flex-shrink-0" style={{ color: 'var(--primary)', width: '60px' }}>
                    <feature.icon className="w-8 h-8" />
                    </div>
                <div>
                    <h4 className="text-lg mb-2 font-semibold">{feature.title}</h4>
                    <p className="text-[15px] text-[#888] leading-[1.6]">{feature.desc}</p>
                    </div>
                  </div>
              ))}
                </div>
              </div>

          <div 
            ref={aboutImageRef}
            data-animate-id="about-image"
            className={`relative h-[400px] sm:h-[500px] lg:h-[700px] mt-8 md:mt-0 scroll-animate-right ${visibleElements.has('about-image') ? 'scroll-animate-visible' : ''}`}
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
      <section id="activities" className="relative py-24 sm:py-32 lg:py-40 px-5 sm:px-8 lg:px-[60px] overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(25, 55, 30, 0.95) 0%, rgba(50, 100, 60, 0.95) 50%, rgba(30, 60, 35, 0.95) 100%)' }}>
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
          <div className="text-xs sm:text-sm uppercase mb-4 sm:mb-[25px] font-semibold" style={{ letterSpacing: '3px', color: 'var(--accent)' }}>
            Recent Highlights
          </div>
          <h2 
            className="font-light leading-[1.2] mb-6 sm:mb-10 text-white text-3xl sm:text-5xl lg:text-[64px]"
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
                  className={`activity-card relative overflow-hidden rounded-lg cursor-pointer scroll-animate-up ${visibleElements.has(`activity-${event.id}`) ? 'scroll-animate-visible' : ''}`}
                  style={{ aspectRatio: '4/5', transitionDelay: `${idx * 0.1}s` }}
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
                      {new Date(event.start_time).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
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
            activityImages.map((activity, idx) => (
              <div
                key={idx}
                className="activity-card relative overflow-hidden rounded-lg cursor-pointer group"
                style={{ aspectRatio: '4/5' }}
              >
                <img
                  src={activity.src}
                  alt={activity.title}
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
                      {activity.date}
                    </div>
                    <h3 
                      className="mb-3 leading-[1.3] text-white"
                      style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '24px', fontWeight: 600 }}
                    >
                      {activity.title}
                    </h3>
                    <div className="flex gap-[25px] text-[13px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      <span className="flex items-center">
                        <i className="fas fa-map-marker-alt mr-2" style={{ color: 'var(--primary)', fontSize: '16px' }}></i>
                        {activity.location}
                      </span>
                      <span className="flex items-center">
                        <i className="fas fa-users mr-2" style={{ color: 'var(--primary)', fontSize: '16px' }}></i>
                        {activity.participants.replace(' Participants', '').replace(' Members', '').replace(' Players', '')}
                      </span>
                    </div>
                  </div>
                </div>
                              </div>
            ))
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
      <section className="relative overflow-hidden py-24 sm:py-32 lg:py-40 px-5 sm:px-8 lg:px-[60px]" style={{ background: 'linear-gradient(135deg, #fef5f8 0%, #fef9f5 50%, #fff5f8 100%)' }}>
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
            <div className="text-xs sm:text-sm uppercase mb-4 sm:mb-[25px] font-semibold" style={{ letterSpacing: '3px', color: 'var(--accent)' }}>
              Members Moments
                                          </div>
            <h2 
              className="font-light leading-[1.2] mb-6 sm:mb-10 text-3xl sm:text-5xl lg:text-[64px]"
              style={{ fontFamily: '"Cormorant Garamond", serif', color: 'var(--dark)' }}
            >
              會員<strong className="font-bold" style={{ color: 'var(--primary)' }}>風采</strong>
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-[#666] px-4">
              記錄每一個精彩瞬間，分享高爾夫的快樂時光
            </p>
                                      </div>

          <div className="relative overflow-hidden" style={{ padding: '20px 0 sm:40px 0' }}>
            <div 
              ref={carouselTrackRef}
              className="flex gap-4 sm:gap-[30px] transition-transform duration-[600ms]"
              style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              {galleryImages.map((img, idx) => (
                                                <div
                                                  key={idx}
                                                  data-animate-id={`gallery-${idx}`}
                                                  className={`flex-shrink-0 rounded-2xl overflow-hidden relative cursor-pointer transition-all duration-[400ms] hover:-translate-y-4 w-full sm:w-[calc((100%-30px)/2)] lg:w-[calc((100%-60px)/3)] scroll-animate-up ${visibleElements.has(`gallery-${idx}`) ? 'scroll-animate-visible' : ''}`}
                                                  style={{ 
                                                    height: windowWidth <= 768 ? '300px' : windowWidth <= 1024 ? '400px' : '500px',
                                                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
                                                    transitionDelay: `${idx * 0.15}s`
                                                  }}
                                                >
                                                  <img
                    src={img}
                    alt="Golf moment"
                    className="w-full h-full object-cover object-center transition-transform duration-[600ms] hover:scale-110"
                                                  />
                                                </div>
                                              ))}
                                            </div>
                                      </div>

          <div className="flex justify-center gap-4 sm:gap-5 mt-8 sm:mt-15">
                          <button
              onClick={prevSlide}
              className="w-12 h-12 sm:w-[60px] sm:h-[60px] rounded-full bg-white border-2 border-[#e0e0e0] text-[var(--dark)] cursor-pointer transition-all duration-300 flex items-center justify-center text-lg sm:text-xl hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-white hover:scale-110"
              style={{ boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)' }}
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                            <button
              onClick={nextSlide}
              className="w-12 h-12 sm:w-[60px] sm:h-[60px] rounded-full bg-white border-2 border-[#e0e0e0] text-[var(--dark)] cursor-pointer transition-all duration-300 flex items-center justify-center text-lg sm:text-xl hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-white hover:scale-110"
              style={{ boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)' }}
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
          </div>

          <div className="flex justify-center gap-2 sm:gap-[10px] mt-6 sm:mt-10">
            {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
                                    <button
                key={idx}
                onClick={() => goToIndex(idx)}
                className={`h-1 rounded transition-all duration-300 border-0 p-0 ${
                  idx === carouselIndex ? 'w-12 sm:w-[60px] bg-[var(--accent)]' : 'w-8 sm:w-10 bg-[#e0e0e0]'
                }`}
              />
                                  ))}
                                </div>
                              </div>
      </section>

      {/* Footer */}
      <footer className="relative overflow-hidden" style={{ background: '#0f0f0f', color: 'rgba(255,255,255,0.7)' }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-[60px] pt-16 sm:pt-20 lg:pt-24 pb-6 sm:pb-8 lg:pb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 sm:gap-16 lg:gap-20 mb-12 sm:mb-16 lg:mb-20">
            {/* Left Column - About */}
            <div>
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
                <img src="/vcl_sample/logo.png" alt="VCL Logo" className="h-12 sm:h-14 w-auto" />
                <div className="flex flex-col gap-1">
                  <span className="text-sm sm:text-base font-medium" style={{ color: 'var(--primary)' }}>溫哥華華人女子高爾夫俱樂部</span>
                  <span className="text-[10px] sm:text-xs uppercase" style={{ color: 'rgba(255,255,255,0.8)', letterSpacing: '1px' }}>Vancouver Chinese Women's Golf Club</span>
                </div>
              </div>
              <p className="text-sm sm:text-[15px] leading-[1.8] mb-6 sm:mb-8" style={{ color: 'rgba(255,255,255,0.7)' }}>
                致力於為熱愛高爾夫的女性打造專屬平台，在優雅運動中建立終身友誼。
              </p>
              <div className="flex gap-3 sm:gap-4">
                {[
                  { name: 'WeChat', icon: 'fab fa-weixin', href: '#' },
                  { name: 'Instagram', icon: 'fab fa-instagram', href: '#' },
                  { name: 'Facebook', icon: 'fab fa-facebook-f', href: '#' },
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

            {/* Right Column - Contact */}
            <div>
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
                  <span className="text-sm sm:text-[15px] leading-[1.6]" style={{ color: 'rgba(255,255,255,0.8)' }}>info@vclgolf.com</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0 text-center" style={{ color: 'var(--primary)', fontSize: '14px sm:text-base' }}>📞</span>
                  <span className="text-sm sm:text-[15px] leading-[1.6]" style={{ color: 'rgba(255,255,255,0.8)' }}>+1 (604) 123-4567</span>
                </div>
              </div>
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
