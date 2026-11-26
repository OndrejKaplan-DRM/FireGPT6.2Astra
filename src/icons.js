import box from 'lucide/icons/box.svg?raw';
import boxes from 'lucide/icons/boxes.svg?raw';
import chevronDown from 'lucide/icons/chevron-down.svg?raw';
import chevronLeft from 'lucide/icons/chevron-left.svg?raw';
import chevronRight from 'lucide/icons/chevron-right.svg?raw';
import download from 'lucide/icons/download.svg?raw';
import fileJson from 'lucide/icons/file-json.svg?raw';
import flame from 'lucide/icons/flame.svg?raw';
import kindling from 'lucide/icons/flame-kindling.svg?raw';
import gauge from 'lucide/icons/gauge.svg?raw';
import github from 'lucide/icons/github.svg?raw';
import grid from 'lucide/icons/grid-3x3.svg?raw';
import image from 'lucide/icons/image.svg?raw';
import layers from 'lucide/icons/layers-3.svg?raw';
import library from 'lucide/icons/library-big.svg?raw';
import maximize from 'lucide/icons/maximize.svg?raw';
import minimize from 'lucide/icons/minimize.svg?raw';
import mouse from 'lucide/icons/mouse.svg?raw';
import orbit from 'lucide/icons/orbit.svg?raw';
import packageIcon from 'lucide/icons/package.svg?raw';
import pause from 'lucide/icons/pause.svg?raw';
import play from 'lucide/icons/play.svg?raw';
import repeat from 'lucide/icons/repeat.svg?raw';
import rotate from 'lucide/icons/rotate-ccw.svg?raw';
import search from 'lucide/icons/search.svg?raw';
import sliders from 'lucide/icons/sliders-horizontal.svg?raw';
import trees from 'lucide/icons/trees.svg?raw';
import wind from 'lucide/icons/wind.svg?raw';
import zap from 'lucide/icons/zap.svg?raw';

const icons = {
  box, boxes, 'chevron-down': chevronDown, 'chevron-left': chevronLeft, 'chevron-right': chevronRight,
  download, 'file-json': fileJson, flame, 'flame-kindling': kindling, gauge, github, 'grid-3x3': grid,
  image, 'layers-3': layers, 'library-big': library, maximize, minimize, mouse, orbit, package: packageIcon,
  pause, play, repeat, 'rotate-ccw': rotate, search, 'sliders-horizontal': sliders, trees, wind, zap,
};

export function icon(name) {
  return icons[name]?.replace('<svg', '<svg aria-hidden="true" focusable="false"') ?? '';
}
