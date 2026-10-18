import { fileNameFromDisposition } from './content-disposition';

describe('fileNameFromDisposition', () => {
  it.each([
    ['attachment; filename="cv-angular.pdf"', 'cv-angular.pdf'],
    ['attachment; filename=lettre.pdf', 'lettre.pdf'],
    ['attachment; filename="../../etc/passwd"', 'passwd'],
    ['attachment', 'document.pdf'],
    [null, 'document.pdf'],
  ])('reads %s as %s', (header, expected) => {
    expect(fileNameFromDisposition(header)).toBe(expected);
  });
});
