import React, { useContext, useMemo, useState } from "react";
import { UserContext } from "../../context/user.context";
import "./Home.css";
import { faker } from "@faker-js/faker";
import { useDarkMode } from "../DarkModeToggle/DarkModeContext";
import { motion } from "framer-motion";
import FramerClient from "../../components/framer-client";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Pagination, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";
import "swiper/css/navigation";
import {
  Facebook,
  HeartPulse,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Stethoscope,
  Twitter,
  Utensils,
  Bot,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const Home = () => {
  const { currentUser } = useContext(UserContext);
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();

  // Reviews
  const reviews = useMemo(
    () =>
      Array.from({ length: 15 }, () => ({
        avatar: faker.image.avatar(),
        name: faker.person.fullName(),
        review: faker.lorem.sentences(2),
        rating: Math.ceil(Math.random() * 5),
      })),
    []
  );

  // Service cards, bigger images
  const services = [
    {
      title: "Meal Planning",
      description:
        "Access a variety of nutritious meal plans and recipes designed to meet your everyday needs.",
      image: "/images/4.jpg",
      route: "/Meal",
    },
    {
      title: "Dietary Needs",
      description:
        "Customise plans based on dietary requirements, allergies, and preferences.",
      image: "/images/5.jpg",
      route: "/dietaryRequirements",
    },
    {
      title: "Create Recipes",
      description:
        "Create personalised recipes tailored to your taste and nutrition goals.",
      image: "/images/6.jpg",
      route: "/createRecipe",
    },
    {
      title: "Product Scanning",
      description:
        "Scan a product to analyse nutrition and receive an easy-to-understand breakdown.",
      image: "/images/7.jpg",
      route: "/ScanProducts",
    },
  ];

  // Contact form
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    fetch("https://localhost:443/api/contactus", {
      method: "POST",
      body: JSON.stringify(formData),
      headers: {
        Origin: "http://localhost:3000/",
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        console.log(response);
        alert("Message sent successfully!");
        setFormData({ name: "", email: "", subject: "", message: "" });
      })
      .catch((error) => {
        console.error("Error sending message:", error);
        alert("Failed to send message. Please try again later.");
      });
  };

  const [subscriptEmail, setSubscriptEmail] = useState("");

  const handleSubscribe = async (e) => {
    e.preventDefault();
    console.log(e.target.name, e.target.value);

    fetch("https://localhost:443/api/home/subscribe", {
      method: "POST",
      body: JSON.stringify({ email: subscriptEmail }),
      headers: {
        Origin: "http://localhost:3000/",
        "Content-Type": "application/json",
      },
    })
    .then((response) => {
      console.log(response);
      alert("Subscribe successfully!");
      setSubscriptEmail("");
    })
    .catch((error) => {
      console.error("Error Subscribe message:", error);
      alert("Failed to Subscribe. Please try again later.");
    });
  };

  const onGetStarted = () => {
    // If logged in, go to dashboard (menu/meal details); otherwise login
    navigate(currentUser ? "/dashboard" : "/login");
  };

  const scrollToContact = () => {
    const el = document.getElementById("contact");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const onAssistant = () => {
    navigate(currentUser ? "/chat" : "/login");
  };

  return (
    <FramerClient>
      <main className={`home ${darkMode ? "home-dark" : ""}`}>
        {/* == HERO == */}
        <section className="home-hero" aria-label="NutriHelp hero">
          <div className="home-hero-inner">
            <motion.div
              className="home-hero-left"
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="home-hero-brand" aria-hidden="true">
                <img
                  src="/images/logos_white.png"
                  alt=""
                  className="home-hero-logo"
                />
              </div>

              <h1 className="home-hero-title">NutriHelp</h1>
              <p className="home-hero-subtitle">
                NutriHelp supports you in managing your general wellbeing and
                nutrient-related conditions through personalised nutrition
                advice.
              </p>

              <div className="home-hero-actions">
                <button className="btn-primary" type="button" onClick={onGetStarted}>
                  Get Started
                </button>
                <button className="btn-secondary" type="button" onClick={scrollToContact}>
                  Contact Us
                </button>
              </div>
            </motion.div>

            <motion.div
              className="home-hero-right"
              initial={{ opacity: 0, x: 120 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 1 }}
            >
              {/* effect image approach, but consistent */}
              <img
                src="https://cdni.iconscout.com/illustration/premium/thumb/cakes-taste-and-quality-feedback-illustration-download-in-svg-png-gif-file-formats--food-app-happy-customer-drink-illustrations-3444786.png"
                alt="Illustration of people and health support"
                className="home-hero-illustration"
                loading="lazy"
              />
            </motion.div>
          </div>
        </section>

        {/* == ABOUT == */}
        <section className="home-about" aria-label="About NutriHelp">
          <div className="home-container about-inner">
            <motion.img
              initial={{ x: -140, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ duration: 1 }}
              src="https://cdni.iconscout.com/illustration/premium/thumb/doctor-consultation-illustration-download-in-svg-png-gif-file-formats--checking-patient-medical-check-up-hospital-checkup-anamnesis-system-pack-healthcare-illustrations-7065409.png"
              className="about-illustration"
              alt="Doctor consultation illustration"
              loading="lazy"
            />

            <div className="about-content">
              <h2 className="section-title">NutriHelp</h2>
              <p className="section-lead">
                NutriHelp assists you in managing your overall well-being,
                preventing nutrient-related diseases, and overcoming
                deficiencies through personalised nutrition plans.
              </p>

              <div className="about-features" role="list">
                <div className="about-feature" role="listitem">
                  <HeartPulse size={40} aria-hidden="true" />
                  <div>
                    <h3>Diagnosis</h3>
                    <p>Identify nutritional risks early with accurate assessments.</p>
                  </div>
                </div>

                <div className="about-feature" role="listitem">
                  <Stethoscope size={40} aria-hidden="true" />
                  <div>
                    <h3>Personalised plan</h3>
                    <p>Tailored nutrition guidance to support your health goals.</p>
                  </div>
                </div>

                <div className="about-feature" role="listitem">
                  <Utensils size={40} aria-hidden="true" />
                  <div>
                    <h3>Dine Pad</h3>
                    <p>Smart meal tracking and recommendations for balanced eating.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* == SERVICES (BIG images, modern card look) == */}
        <section className="home-services" aria-label="NutriHelp services">
          <div className="home-container">
            <header className="section-header">
              <h2 className="section-title">Services</h2>
              <p className="section-lead">
                Explore key services designed to support your nutrition journey.
              </p>
            </header>

            <div className="services-grid">
              {services.map((s, i) => (
                <motion.article
                  key={i}
                  className="service-card"
                  whileHover={{ scale: 1.03 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    type="button"
                    className="service-card-btn"
                    onClick={() => navigate(s.route)}
                    aria-label={`Open ${s.title}`}
                  >
                    <img src={s.image} alt={s.title} className="service-image" loading="lazy" />
                    <div className="service-body">
                      <h3 className="service-title">{s.title}</h3>
                      <p className="service-desc">{s.description}</p>
                      <span className="service-cta">Open</span>
                    </div>
                  </button>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        {/* == REVIEWS == */}
        <section className="home-reviews" aria-label="User reviews">
          <div className="home-container">
            <header className="section-header">
              <h2 className="section-title">User Reviews</h2>
              <p className="section-lead">See what our users have to say about NutriHelp.</p>
            </header>

            <Swiper
              effect={"coverflow"}
              grabCursor={true}
              centeredSlides={true}
              slidesPerView={"auto"}
              coverflowEffect={{
                rotate: 30,
                stretch: 0,
                depth: 100,
                modifier: 1,
                slideShadows: false,
              }}
              pagination={{ clickable: true }}
              navigation={true}
              modules={[EffectCoverflow, Pagination, Navigation]}
              className="mySwiper"
            >
              {reviews.map((review, index) => (
                <SwiperSlide key={index} className="review-slide">
                  <div className={`review-card ${darkMode ? "review-card-dark" : ""}`}>
                    <img
                      src={review.avatar}
                      alt={`${review.name}'s avatar`}
                      className="review-avatar"
                      loading="lazy"
                    />

                    <h3 className="review-name">{review.name}</h3>
                    <div className="review-rating" aria-label={`Rating ${review.rating} out of 5`}>
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </div>
                    <p className="review-text">“{review.review}”</p>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </section>

        {/* == CONTACT == */}
        <section id="contact" className="home-contact" aria-label="Contact us">
          <div className="home-container">
            <header className="section-header">
              <h2 className="section-title">Contact</h2>
              <p className="section-lead">
                Have questions or need assistance? Reach out to us.
              </p>
            </header>

            <div className="contact-grid">
              <div className="contact-info" aria-label="Contact information">
                <div className="contact-info-card">
                  <MapPin aria-hidden="true" />
                  <div>
                    <h3>Location</h3>
                    <p>799 Nutrihelp Rd, Melbourne, Vic, 3000</p>
                  </div>
                </div>

                <div className="contact-info-card">
                  <Mail aria-hidden="true" />
                  <div>
                    <h3>Email</h3>
                    <p>info@nutrihelp.com.au</p>
                  </div>
                </div>

                <div className="contact-info-card">
                  <Phone aria-hidden="true" />
                  <div>
                    <h3>Call</h3>
                    <p>1300 798 999</p>
                  </div>
                </div>
              </div>

              <form className="contact-form" onSubmit={handleSubmit} aria-label="Contact form">
                <label className="sr-only" htmlFor="name">Your Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />

                <label className="sr-only" htmlFor="email">Your Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Your Email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />

                <label className="sr-only" htmlFor="subject">Subject</label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  placeholder="Subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                />

                <label className="sr-only" htmlFor="message">Message</label>
                <textarea
                  id="message"
                  name="message"
                  rows="5"
                  placeholder="Message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                />

                <button type="submit" className="btn-primary btn-full">
                  Submit
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* == FOOTER (social links + contact) == */}
        <footer className="home-footer" aria-label="Footer">
          <div className="footer-inner home-container">
            <div className="footer-brand">
              <img src="/images/logo.png" alt="NutriHelp logo" className="footer-logo" />
              <div className="footer-social" aria-label="Social media links">
                <a href="#" aria-label="Twitter"><Twitter /></a>
                <a href="#" aria-label="Facebook"><Facebook /></a>
                <a href="#" aria-label="Instagram"><Instagram /></a>
                <a href="#" aria-label="LinkedIn"><Linkedin /></a>
              </div>
              <p className="footer-follow">Follow us</p>
            </div>

            <div className="footer-details">
              <div className="footer-detail-row">
                <MapPin aria-hidden="true" />
                <span>799 Nutrihelp Rd, Melbourne, Vic, 3000</span>
              </div>
              <div className="footer-detail-row">
                <Mail aria-hidden="true" />
                <span>info@nutrihelp.com.au</span>
              </div>
              <div className="footer-detail-row">
                <Phone aria-hidden="true" />
                <span>1300 798 999</span>
              </div>
            </div>

            <div className="footer-newsletter">
              <h3>Newsletter</h3>
              <p>Stay updated with our latest news and insights.</p>
              <form onSubmit={handleSubscribe} className="newsletter-form">
                <label className="sr-only" htmlFor="newsletterEmail">Email</label>
                <input id="newsletterEmail" type="email" placeholder="Enter your email" value={subscriptEmail} onChange={(e)=>{setSubscriptEmail(e.target.value)}}/>
                <button type="submit" className="btn-primary">
                  Subscribe
                </button>
              </form>
            </div>
          </div>
        </footer>

        {/* == Floating Assistant Button == */}
        <button
          className="assistant-btn"
          aria-label="Open assistant"
          type="button"
          onClick={onAssistant}
        >
          <Bot size={26} aria-hidden="true" />
          <span>Assistant</span>
        </button>
      </main>
    </FramerClient>
  );
};

export default Home;
