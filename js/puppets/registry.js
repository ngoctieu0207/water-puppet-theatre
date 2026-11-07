// Puppet registry. Each puppet module exports:
// { id, name, nameEn, blurb, signature, speed?, top?, portrait?, build(), idle(), actions: { wave, jump, dive, perform } }
import { boy, girl } from './children.js';
import { elder } from './elder.js';
import { dragon } from './dragon.js';
import { phoenix } from './phoenix.js';
import { turtle } from './turtle.js';

export const PUPPETS = [boy, girl, elder, dragon, phoenix, turtle];

export function getPuppet(id) {
  return PUPPETS.find((p) => p.id === id) || PUPPETS[0];
}
