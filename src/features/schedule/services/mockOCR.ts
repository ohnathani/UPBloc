import type { OCRProgress, OCRProvider, OCRResult } from './ocr'

const mockCRSText = `UNIVERSITY OF THE PHILIPPINES
UP FORM 5 CERTIFICATE OF REGISTRATION
CLASS CODE | SUBJECT | SECTION | UNITS | SCHEDULE & ROOM
20386 | CMSC 10 | F | 3 | TTH 2:30 PM-4:00 PM / ROOM: CSM 112
20388 | CMSC 18 | M-1L | 3 | T 7:00 AM-10:00 AM / ROOM: CSM 223
WF 1:00 PM-2:00 PM / ROOM: CSM 206
20394 | CMSC 3 | N-2L | 3 | TH 7:00 AM-10:30 AM / ROOM: CSM 229
WF 2:30 PM-3:30 PM / ROOM: CSM 206
20395 | CMSC 56 | O | 3 | WF 4:00 PM-5:30 PM / ROOM: CSM 222
20652 | PE 1 | K | 2 | WF 10:00 AM-11:00 AM / ROOM: TBA
20684 | SAS | D | 0 | TH 11:30 AM-1:00 PM / ROOM: CHSS 103
21033 | NSTP 1-CWTS | UV6 | 3 | M 1:00 PM-4:00 PM / ROOM: TBA`

export class MockOCRProvider implements OCRProvider {
  async extractText(
    _image: File,
    onProgress?: (progress: OCRProgress) => void,
  ): Promise<OCRResult> {
    onProgress?.({ status: 'reading', progress: 0 })
    await Promise.resolve()
    onProgress?.({ status: 'recognizing', progress: 1 })

    return { text: mockCRSText, confidence: 98 }
  }
}
