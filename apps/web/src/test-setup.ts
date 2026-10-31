import { getTestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';

// Environnement de test zoneless (zone.js retiré du projet).
getTestBed().initTestEnvironment(
  BrowserTestingModule,
  platformBrowserTesting(),
);
