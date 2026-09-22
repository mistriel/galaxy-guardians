import '@fontsource/heebo/hebrew-400.css';
import '@fontsource/heebo/hebrew-700.css';
import '@fontsource/heebo/hebrew-800.css';
import '@fontsource/heebo/hebrew-900.css';
import '@fontsource/heebo/latin-400.css';
import '@fontsource/heebo/latin-700.css';
import '@fontsource/heebo/latin-800.css';
import '@fontsource/heebo/latin-900.css';
import './style.css';
import { Game } from './game/Game.js';

const canvas = document.createElement('canvas');
document.querySelector('#app').appendChild(canvas);

const game = new Game(canvas);
game.startLoop();
