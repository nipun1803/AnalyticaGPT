import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial } from '@react-three/drei';
import { ArrowRight, BarChart2, BrainCircuit, ShieldCheck, Database, Zap, LineChart, FileText, CheckCircle2, Sparkles } from 'lucide-react';
import AuthPage from './AuthPage';

function AnimatedSphere() {
  const sphereRef = useRef();

  useFrame(({ clock }) => {
    if (sphereRef.current) {
      sphereRef.current.rotation.x = clock.getElapsedTime() * 0.15;
      sphereRef.current.rotation.y = clock.getElapsedTime() * 0.2;
    }
  });

  return (
    <Sphere ref={sphereRef} args={[1, 64, 64]} scale={1.8}>
      <MeshDistortMaterial
        color="#ffffff"
        attach="material"
        distort={0.4}
        speed={1.5}
        roughness={0.1}
        metalness={0.9}
        wireframe={true}
      />
    </Sphere>
  );
}

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (showAuth) {
    return <AuthPage />;
  }

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const stagger = {
    visible: { transition: { staggerChildren: 0.1 } }
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden font-sans relative selection:bg-white selection:text-black">
      {/* Background Grid */}
      <div className="fixed inset-0 z-0 opacity-[0.15] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      
      {/* Navbar */}
      <nav 
        role="navigation" 
        aria-label="Main Navigation"
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 lg:px-12 transition-all duration-300 ${scrolled ? 'bg-black/80 backdrop-blur-md border-b border-white/10' : 'bg-transparent'}`}
      >
        <motion.div 
          initial="hidden" animate="visible" variants={fadeIn}
          className="flex items-center gap-3"
        >
          <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center text-black font-bold text-xl shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            A
          </div>
          <span className="text-xl font-bold tracking-tight">AnalyticaGPT</span>
        </motion.div>
        <motion.div initial="hidden" animate="visible" variants={fadeIn}>
          <button 
            onClick={() => setShowAuth(true)}
            className="px-5 py-2 text-sm font-semibold bg-white text-black hover:bg-gray-200 transition-colors rounded-full"
          >
            Sign In
          </button>
        </motion.div>
      </nav>

      <main className="relative z-10 flex flex-col items-center">
        
        {/* Hero Section */}
        <section className="relative flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8 text-center pt-20 w-full">
          
          {/* 3D Element Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[1000px] max-h-[1000px] -z-10 opacity-40 lg:opacity-60 pointer-events-none"
          >
            <Canvas camera={{ position: [0, 0, 4.5] }}>
              <ambientLight intensity={0.5} />
              <directionalLight position={[10, 10, 5]} intensity={1.5} />
              <AnimatedSphere />
            </Canvas>
          </motion.div>

          <motion.div
            initial="hidden" animate="visible" variants={stagger}
            className="max-w-5xl mx-auto space-y-8 backdrop-blur-sm bg-black/10 p-8 rounded-3xl"
          >
            <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              <span>Introducing AnalyticaGPT Enterprise</span>
            </motion.div>
            
            <motion.h1 variants={fadeIn} className="text-5xl sm:text-7xl lg:text-8xl font-extrabold tracking-tighter leading-[1.05]">
              Intelligence <br className="hidden sm:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-100 via-gray-400 to-gray-600">
                Redefined.
              </span>
            </motion.h1>
            
            <motion.p variants={fadeIn} className="max-w-2xl mx-auto text-lg sm:text-xl text-gray-400 font-light leading-relaxed">
              Elevate your data analysis with AI-powered insights, automated EDA, and professional reporting in a seamless, high-performance environment.
            </motion.p>

            <motion.div variants={fadeIn} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
              <button 
                onClick={() => setShowAuth(true)}
                className="group flex items-center gap-2 px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-gray-200 hover:scale-105 transition-all w-full sm:w-auto justify-center shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-8 py-4 bg-black border border-white/30 text-white font-semibold rounded-full hover:bg-white/10 transition-all w-full sm:w-auto">
                View Documentation
              </button>
            </motion.div>
          </motion.div>
        </section>

        {/* Platform Overview */}
        <section className="w-full py-32 px-6 lg:px-12 bg-gradient-to-b from-transparent to-white/5 border-t border-white/10">
          <div className="max-w-7xl mx-auto">
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger}
              className="text-center mb-20"
            >
              <motion.h2 variants={fadeIn} className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Everything you need to analyze data.</motion.h2>
              <motion.p variants={fadeIn} className="text-gray-400 text-lg max-w-2xl mx-auto">Stop writing boilerplate code. AnalyticaGPT handles data cleaning, modeling, and visualization out of the box.</motion.p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { title: "Smart Analytics", icon: <BarChart2 className="w-6 h-6"/>, desc: "Automated insights and interactive Recharts visualizations tailored to your specific dataset columns." },
                { title: "Machine Learning", icon: <BrainCircuit className="w-6 h-6"/>, desc: "Built-in Scikit-learn models for regression, classification, clustering, and anomaly detection." },
                { title: "RAG & LLM Chat", icon: <Zap className="w-6 h-6"/>, desc: "Query your data in plain English. Powered by Groq's blazing fast LLaMA 3.1 70B and ChromaDB." },
                { title: "Data Pipelines", icon: <Database className="w-6 h-6"/>, desc: "Drag-and-drop CSV uploads with automatic imputation, categorical encoding, and scaling." },
                { title: "Predictive Forecasting", icon: <LineChart className="w-6 h-6"/>, desc: "Time-series forecasting with Gradient Boosting, featuring 95% confidence intervals." },
                { title: "PDF Reports", icon: <FileText className="w-6 h-6"/>, desc: "Generate professional, branded PDF reports summarizing statistics, charts, and AI-driven insights." }
              ].map((feat, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  key={i} 
                  className="p-8 bg-black border border-white/10 rounded-3xl hover:border-white/30 transition-colors group"
                >
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-white group-hover:text-black transition-all">
                    {feat.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feat.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{feat.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="w-full py-32 px-6 lg:px-12 bg-black">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <motion.div 
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
                className="lg:w-1/2 space-y-8"
              >
                <motion.h2 variants={fadeIn} className="text-4xl md:text-5xl font-bold tracking-tight">From CSV to Insights in seconds.</motion.h2>
                <motion.div variants={stagger} className="space-y-6">
                  {[
                    "Upload your raw data via secure drag-and-drop.",
                    "AnalyticaGPT automatically profiles, cleans, and indexes your data.",
                    "Explore interactive charts and run Machine Learning models.",
                    "Ask complex questions and generate comprehensive PDF reports."
                  ].map((step, i) => (
                    <motion.div variants={fadeIn} key={i} className="flex items-start gap-4">
                      <div className="mt-1 bg-white rounded-full p-1 text-black">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <p className="text-lg text-gray-300">{step}</p>
                    </motion.div>
                  ))}
                </motion.div>
                <motion.button 
                  variants={fadeIn}
                  onClick={() => setShowAuth(true)}
                  className="mt-8 px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors"
                >
                  Start Analyzing Now
                </motion.button>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="lg:w-1/2 relative"
              >
                <div className="aspect-square md:aspect-video lg:aspect-square bg-gradient-to-tr from-zinc-900 to-zinc-800 rounded-3xl border border-white/10 shadow-2xl flex items-center justify-center p-8 overflow-hidden relative">
                  {/* Decorative UI Elements to simulate the app */}
                  <div className="w-full h-full border border-white/5 bg-black rounded-xl p-4 flex flex-col gap-4 relative z-10 shadow-2xl">
                     <div className="flex gap-2 mb-2">
                       <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                       <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                       <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                     </div>
                     <div className="h-8 bg-white/10 rounded w-1/3"></div>
                     <div className="flex-1 flex gap-4">
                       <div className="w-1/4 h-full bg-white/5 rounded"></div>
                       <div className="w-3/4 h-full bg-white/5 rounded flex flex-col gap-4 p-4">
                         <div className="h-32 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded flex items-end p-2 gap-2">
                            {[40, 70, 45, 90, 65, 80, 55].map((h, j) => (
                              <div key={j} className="flex-1 bg-white/20 rounded-t" style={{ height: `${h}%` }}></div>
                            ))}
                         </div>
                         <div className="h-20 bg-white/5 rounded"></div>
                       </div>
                     </div>
                  </div>
                  {/* Glow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-white/5 blur-3xl rounded-full pointer-events-none"></div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="w-full py-32 px-6 text-center border-t border-white/10 bg-gradient-to-b from-black to-zinc-950">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto space-y-8"
          >
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight">Ready to unlock your data?</h2>
            <p className="text-xl text-gray-400">Join forward-thinking enterprises using AnalyticaGPT.</p>
            <button 
              onClick={() => setShowAuth(true)}
              className="px-10 py-5 bg-white text-black text-lg font-bold rounded-full hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.15)]"
            >
              Create Free Account
            </button>
          </motion.div>
        </section>
        
        {/* Simple Footer */}
        <footer className="w-full py-8 text-center text-zinc-600 text-sm border-t border-white/5">
          <p>© 2026 AnalyticaGPT. Enterprise Data Engine.</p>
        </footer>

      </main>
    </div>
  );
}
