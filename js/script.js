/* In-page navigation, the persistent music player, and decorative details. */
(() => {
  'use strict';

  const views = [...document.querySelectorAll('[data-page-view]')];
  const viewLinks = document.querySelectorAll('[data-view-link]');
  const elements = {
    audio: document.querySelector('[data-audio]'),
    closePlayer: document.querySelector('[data-close-player]'),
    player: document.querySelector('#music-player'),
    play: document.querySelector('[data-play]'),
    previous: document.querySelector('[data-previous]'),
    next: document.querySelector('[data-next]'),
    progress: document.querySelector('[data-progress]'),
    trackList: document.querySelector('[data-track-list]'),
    island: document.querySelector('[data-island]'),
    islandPlay: document.querySelector('[data-island-play]'),
    islandExpand: document.querySelector('[data-island-expand]'),
    islandPlaylist: document.querySelector('[data-island-playlist]')
  };

  // Exactly three track slots; fill metadata and asset paths when the final songs are supplied.
  const tracks = [
    { title: 'Amethyst', artist: 'Pastel Ghost', src: 'assets/music/Amethyst - Pastel Ghost.mp3', cover: 'assets/covers/Amethyst.jpeg' },
    { title: 'Bayangkan', artist: 'Hindia', src: 'assets/music/Bayangkan - Hindia.mp3', cover: 'assets/covers/Bayangkan.jpeg' },
    { title: '505', artist: 'Arctic Monkeys', src: 'assets/music/505 - Arctic Monkeys.mp3', cover: 'assets/covers/505.jpeg' }
  ];

  // This single audio element remains outside both views, so view changes never interrupt playback.
  const audio = elements.audio;
  let activeTrack = 0;
  let hasSelectedTrack = false;
  let pendingTrackPlay = false;
  let islandHideTimeout = 0;

  function setView(name, { push = true, focus = false } = {}) {
    const targetId = name === 'letter' ? 'letter-view' : 'home-view';
    const target = document.getElementById(targetId);
    if (!target) return;

    views.forEach((view) => {
      const isActive = view === target;
      view.hidden = !isActive;
      view.setAttribute('aria-hidden', String(!isActive));
    });

    if (push && window.location.hash !== `#${name}`) {
      window.history.pushState({ view: name }, '', `#${name}`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (focus) {
      const heading = target.querySelector('h1');
      heading?.setAttribute('tabindex', '-1');
      heading?.focus({ preventScroll: true });
    }
  }

  // Always begin at the welcome view, even if this document was opened with a letter hash.
  window.history.replaceState({ view: 'home' }, '', `${window.location.pathname}${window.location.search}#home`);
  views.forEach((view) => view.setAttribute('aria-hidden', String(view.id !== 'home-view')));

  viewLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const destination = link.dataset.viewLink === 'letter' ? 'letter' : 'home';
      setView(destination, { focus: true });
    });
  });

  window.addEventListener('popstate', () => {
    setView(window.location.hash === '#letter' ? 'letter' : 'home', { push: false });
  });

  // Light, irregular heart scatter in each view; the field itself is non-interactive and aria-hidden.
  document.querySelectorAll('[data-heart-field]').forEach((field) => {
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 28; index += 1) {
      const heart = document.createElement('span');
      heart.className = 'heart';
      heart.textContent = '♥';
      heart.style.setProperty('--heart-x', `${Math.random() * 96}%`);
      heart.style.setProperty('--heart-y', `${Math.random() * 96}%`);
      heart.style.setProperty('--heart-size', `${8 + Math.random() * 13}px`);
      heart.style.setProperty('--heart-opacity', `${0.08 + Math.random() * 0.08}`);
      heart.style.setProperty('--heart-rotation', `${-24 + Math.random() * 48}deg`);
      heart.style.setProperty('--heart-color', 'var(--color-evergreen)');
      heart.style.setProperty('--heart-blur', `${Math.random() * 1.5}px`);
      fragment.append(heart);
    }
    field.append(fragment);
  });

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return '0:00';
    return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  }

  function updateTrackText(node, value) {
    if (node.textContent === value) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || typeof node.animate !== 'function') {
      node.textContent = value;
      return;
    }

    node.getAnimations().forEach((animation) => animation.cancel());
    const fadeOut = node.animate(
      [
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: 'translateY(-3px)' }
      ],
      { duration: 90, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }
    );

    fadeOut.onfinish = () => {
      node.textContent = value;
      fadeOut.cancel();
      const fadeIn = node.animate(
        [
          { opacity: 0, transform: 'translateY(3px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ],
        { duration: 180, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
      );
      fadeIn.onfinish = () => fadeIn.cancel();
    };
  }

  function renderTrack() {
    const track = tracks[activeTrack];
    const cover = document.querySelector('[data-track-cover]');
    if (cover && cover.getAttribute('src') !== track.cover) {
      cover.src = track.cover;
      cover.alt = `Cover album ${track.title} oleh ${track.artist}`;
    }
    document.querySelectorAll('[data-track-title], [data-island-title]').forEach((node) => {
      updateTrackText(node, track.title);
    });
    document.querySelectorAll('[data-track-artist], [data-island-artist]').forEach((node) => {
      updateTrackText(node, track.artist);
    });
    elements.trackList?.querySelectorAll('[data-track-select]').forEach((button) => {
      const isActive = hasSelectedTrack && Number(button.dataset.trackSelect) === activeTrack;
      button.setAttribute('aria-pressed', String(isActive));
    });
    if (audio && track.src) audio.src = track.src;
  }

  function setIslandExpanded(isExpanded) {
    if (!elements.islandExpand || !elements.islandPlaylist) return;

    elements.islandExpand.setAttribute('aria-expanded', String(isExpanded));
    elements.islandExpand.setAttribute(
      'aria-label',
      isExpanded ? 'Sembunyikan playlist' : 'Tampilkan playlist'
    );
    elements.islandExpand.classList.toggle('is-expanded', isExpanded);
    elements.island?.classList.toggle('island-expanded', isExpanded);
    elements.islandPlaylist.setAttribute('aria-hidden', String(!isExpanded));
    elements.islandPlaylist.inert = !isExpanded;
  }

  function setPlaying(isPlaying) {
    if (elements.play) {
      elements.play.classList.toggle('is-playing', isPlaying);
      elements.play.setAttribute('aria-label', isPlaying ? 'Jeda' : 'Putar');
    }
    if (elements.islandPlay) {
      elements.islandPlay.classList.toggle('is-playing', isPlaying);
      elements.islandPlay.setAttribute('aria-label', isPlaying ? 'Jeda' : 'Putar');
    }

    if (!elements.island) return;
    window.clearTimeout(islandHideTimeout);
    elements.island.classList.toggle('is-playing', isPlaying);

    if (isPlaying) {
      elements.island.hidden = false;
      window.requestAnimationFrame(() => elements.island.classList.add('is-visible'));
      return;
    }

    setIslandExpanded(false);
    elements.island.classList.remove('is-visible');
    const hideDelay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 460;
    islandHideTimeout = window.setTimeout(() => {
      if (audio?.paused) elements.island.hidden = true;
    }, hideDelay);
  }

  function revealPlayer() {
    if (!elements.player) return;
    elements.player.inert = false;
    elements.player.setAttribute('aria-hidden', 'false');
    elements.player.classList.add('is-open');
  }

  function selectTrack(index, playAfterSelect = false) {
    activeTrack = (index + tracks.length) % tracks.length;
    hasSelectedTrack = true;
    pendingTrackPlay = playAfterSelect;
    if (audio) audio.pause();
    revealPlayer();
    renderTrack();
    if (playAfterSelect) {
      startPlayback();
    } else {
      pendingTrackPlay = false;
    }
  }

  async function startPlayback() {
    if (!audio || !tracks[activeTrack].src) return;
    try {
      await audio.play();
      pendingTrackPlay = false;
      setPlaying(true);
    } catch {
      pendingTrackPlay = false;
      setPlaying(false);
    }
  }

  function togglePlayback() {
    if (!audio) return;
    if (audio.paused) startPlayback();
    else audio.pause();
  }

  elements.closePlayer?.addEventListener('click', () => {
    elements.player.classList.remove('is-open');
    elements.player.setAttribute('aria-hidden', 'true');
    elements.player.inert = true;
  });
  elements.play?.addEventListener('click', togglePlayback);
  elements.islandPlay?.addEventListener('click', togglePlayback);
  elements.previous?.addEventListener('click', () => selectTrack(activeTrack - 1, !audio?.paused));
  elements.next?.addEventListener('click', () => selectTrack(activeTrack + 1, !audio?.paused));
  elements.trackList?.addEventListener('click', (event) => {
    const trackButton = event.target.closest('[data-track-select]');
    if (trackButton) selectTrack(Number(trackButton.dataset.trackSelect), true);
  });
  elements.islandExpand?.addEventListener('click', () => {
    const expanded = elements.islandExpand.getAttribute('aria-expanded') === 'true';
    setIslandExpanded(!expanded);
  });
  elements.islandPlaylist?.addEventListener('click', (event) => {
    const trackButton = event.target.closest('[data-island-track]');
    if (trackButton) selectTrack(Number(trackButton.dataset.islandTrack), true);
  });

  audio?.addEventListener('play', () => {
    pendingTrackPlay = false;
    setPlaying(true);
  });
  audio?.addEventListener('pause', () => {
    if (!pendingTrackPlay) setPlaying(false);
  });
  audio?.addEventListener('ended', () => selectTrack(activeTrack + 1, true));
  audio?.addEventListener('loadedmetadata', () => {
    document.querySelectorAll('[data-duration]').forEach((node) => { node.textContent = formatTime(audio.duration); });
  });
  audio?.addEventListener('timeupdate', () => {
    if (elements.progress && Number.isFinite(audio.duration)) elements.progress.value = String((audio.currentTime / audio.duration) * 100);
    document.querySelectorAll('[data-current-time]').forEach((node) => { node.textContent = formatTime(audio.currentTime); });
  });
  elements.progress?.addEventListener('input', () => {
    if (audio && Number.isFinite(audio.duration)) audio.currentTime = (Number(elements.progress.value) / 100) * audio.duration;
  });

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));
  } else {
    document.querySelectorAll('.reveal').forEach((element) => element.classList.add('is-visible'));
  }

  renderTrack();
})();
