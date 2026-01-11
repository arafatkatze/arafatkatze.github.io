// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-about",
    title: "About",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-blog",
          title: "Blog",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/blog/";
          },
        },{id: "nav-publications",
          title: "Publications",
          description: "Back in the day I wrote some research papers and also got published in a book",
          section: "Navigation",
          handler: () => {
            window.location.href = "/publications/";
          },
        },{id: "nav-projects",
          title: "Projects",
          description: "Some of my favourite life stories and photos",
          section: "Navigation",
          handler: () => {
            window.location.href = "/projects/";
          },
        },{id: "nav-resume",
          title: "Resume",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/cv/";
          },
        },{id: "nav-opensource",
          title: "Opensource",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/repositories/";
          },
        },{id: "post-lessons-from-traveling-to-30-countries",
        
          title: "Lessons from Traveling to 30 Countries",
        
        description: "Lessons from traveling to 30 countries",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/philosophy/2026/01/05/travelling.html";
          
        },
      },{id: "post-mountain-of-spirits",
        
          title: "Mountain of Spirits",
        
        description: "Finding transcendence on the slopes of Mont Tremblant",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/philosophy/2025/12/15/mountain-of-spirits.html";
          
        },
      },{id: "post-i-hope-it-happens-for-you",
        
          title: "I Hope It Happens For You",
        
        description: "On matchmaking, love, and the magic of bringing people together",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/philosophy/2025/08/10/i-hope-it-happens-for-you.html";
          
        },
      },{id: "post-messages-to-24-people-i-know",
        
          title: "Messages to 24 People I Know",
        
        description: "Anonymous letters to people who shaped my life",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/philosophy/2025/03/05/messages-to-24-people.html";
          
        },
      },{id: "post-with-or-without-you",
        
          title: "With or Without You",
        
        description: "Finding your tribe by seeking those who do weird shit with or without you",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/philosophy/2025/01/10/with-or-without-you.html";
          
        },
      },{id: "post-the-bike-trip-that-never-was",
        
          title: "The Bike Trip that Never Was",
        
        description: "Choosing between a cross-continental bike trip and building AGI",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/philosophy/2024/12/20/bike-trip-that-never-was.html";
          
        },
      },{id: "post-faith-is-all-you-need",
        
          title: "Faith is All You Need",
        
        description: "Why belief in your work transforms everything",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/philosophy/2024/12/15/faith-is-all-you-need.html";
          
        },
      },{id: "post-on-looking-inwards",
        
          title: "On Looking Inwards",
        
        description: "",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/philosophy/2024/05/06/inwards.html";
          
        },
      },{id: "books-the-godfather",
          title: 'The Godfather',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/the_godfather.html";
            },},{id: "news-i-have-joined-cline",
          title: 'I have joined Cline',
          description: "",
          section: "News",handler: () => {
              window.location.href = "/news/announcement_2.html";
            },},{id: "projects-agentic-ai-writings",
          title: 'Agentic AI writings',
          description: "",
          section: "Projects",handler: () => {
              window.location.href = "/projects/AgenticAi/";
            },},{id: "projects-art",
          title: 'Art',
          description: "",
          section: "Projects",handler: () => {
              window.location.href = "/projects/Art/";
            },},{id: "projects-brazil",
          title: 'Brazil',
          description: "",
          section: "Projects",handler: () => {
              window.location.href = "/projects/Brazil/";
            },},{id: "projects-skiing",
          title: 'Skiing',
          description: "",
          section: "Projects",handler: () => {
              window.location.href = "/projects/Skiing/";
            },},{id: "projects-white-shirt-project",
          title: 'White Shirt Project',
          description: "",
          section: "Projects",handler: () => {
              window.location.href = "/projects/communalArt/";
            },},{id: "projects-priviledged-homelessness",
          title: 'Priviledged Homelessness',
          description: "",
          section: "Projects",handler: () => {
              window.location.href = "/projects/homelessness/";
            },},{id: "projects-mathematics-of-love",
          title: 'Mathematics of Love',
          description: "",
          section: "Projects",handler: () => {
              window.location.href = "/projects/mathmaking/";
            },},{id: "projects-but-you-are-just-a-quot-content-creator-quot",
          title: 'But you are just a &amp;quot;content creator&amp;quot;',
          description: "",
          section: "Projects",handler: () => {
              window.location.href = "/projects/writers/";
            },},{
        id: 'social-cv',
        title: 'CV',
        section: 'Socials',
        handler: () => {
          window.open("https://drive.google.com/file/d/1olsu2yUuQrYxp-CbP651FAyyESe2oenA/view?usp=sharing", "_blank");
        },
      },{
        id: 'social-email',
        title: 'email',
        section: 'Socials',
        handler: () => {
          window.open("mailto:%61%72%61%66%61%74.%64%61.%6B%68%61%6E@%67%6D%61%69%6C.%63%6F%6D", "_blank");
        },
      },{
        id: 'social-github',
        title: 'GitHub',
        section: 'Socials',
        handler: () => {
          window.open("https://github.com/arafatkatze", "_blank");
        },
      },{
        id: 'social-instagram',
        title: 'Instagram',
        section: 'Socials',
        handler: () => {
          window.open("https://instagram.com/arafatkatze", "_blank");
        },
      },{
        id: 'social-linkedin',
        title: 'LinkedIn',
        section: 'Socials',
        handler: () => {
          window.open("https://www.linkedin.com/in/arafatkatze", "_blank");
        },
      },{
        id: 'social-rss',
        title: 'RSS Feed',
        section: 'Socials',
        handler: () => {
          window.open("/feed.xml", "_blank");
        },
      },{
        id: 'social-x',
        title: 'X',
        section: 'Socials',
        handler: () => {
          window.open("https://twitter.com/arafatkatze", "_blank");
        },
      },{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];
