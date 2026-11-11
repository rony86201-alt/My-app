/* stb_image_write - v1.16 - public domain - http://nothings.org/stb
   PNG writer subset for Android JNI in-memory conversion
*/
#ifndef INCLUDE_STB_IMAGE_WRITE_H
#define INCLUDE_STB_IMAGE_WRITE_H

#include <stdlib.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef void stbi_write_func(void *context, void *data, int size);

#ifndef STBIWDEF
#ifdef STB_IMAGE_WRITE_STATIC
#define STBIWDEF static
#else
#define STBIWDEF extern
#endif
#endif

STBIWDEF int stbi_write_png_to_func(stbi_write_func *func, void *context, int w, int h, int comp, const void  *data, int stride_in_bytes);

#ifdef __cplusplus
}
#endif

#endif // INCLUDE_STB_IMAGE_WRITE_H

#ifdef STB_IMAGE_WRITE_IMPLEMENTATION

#include <stdarg.h>
#include <string.h>

static void stbiw__writefv(stbi_write_func *s, void *context, const char *fmt, va_list v) {
   while (*fmt) {
      switch (*fmt++) {
         case ' ': break;
         case '1': { unsigned char x = (unsigned char) va_arg(v, int); s(context, &x, 1); break; }
         case '2': { int x = va_arg(v, int); unsigned char b[2];
                     b[0] = (unsigned char)((x >> 8) & 0xFF);
                     b[1] = (unsigned char)(x & 0xFF);
                     s(context, b, 2); break; }
         case '4': { int x = va_arg(v, int); unsigned char b[4];
                     b[0] = (unsigned char)((x >> 24) & 0xFF);
                     b[1] = (unsigned char)((x >> 16) & 0xFF);
                     b[2] = (unsigned char)((x >> 8) & 0xFF);
                     b[3] = (unsigned char)(x & 0xFF);
                     s(context, b, 4); break; }
         default: return;
      }
   }
}

static void stbiw__writef(stbi_write_func *s, void *context, const char *fmt, ...) {
   va_list v;
   va_start(v, fmt);
   stbiw__writefv(s, context, fmt, v);
   va_end(v);
}

static unsigned int stbiw__crc32(unsigned char *buffer, int len) {
   static unsigned int crc_table[256];
   static int crc_table_computed = 0;
   if (!crc_table_computed) {
      for (unsigned int n = 0; n < 256; n++) {
         unsigned int c = n;
         for (int k = 0; k < 8; k++) {
            if (c & 1) c = 0xedb88320L ^ (c >> 1);
            else c = c >> 1;
         }
         crc_table[n] = c;
      }
      crc_table_computed = 1;
   }
   unsigned int c = ~0u;
   for (int i = 0; i < len; ++i) {
      c = crc_table[(c ^ buffer[i]) & 0xff] ^ (c >> 8);
   }
   return ~c;
}

static void stbiw__wpcrc(stbi_write_func *s, void *context, unsigned char *data, int len) {
   unsigned int c = stbiw__crc32(data, len);
   stbiw__writef(s, context, "4", c);
}

static unsigned char *stbi_zlib_compress(unsigned char *data, int data_len, int *out_len, int quality);

// Minimal PNG writer using uncompressed deflate blocks for rapid in-memory encoding on Android
static unsigned char *stbi_zlib_compress(unsigned char *data, int data_len, int *out_len, int quality) {
   (void)quality;
   // Max size for uncompressed deflate: 2 header bytes + (5 bytes per 65535 data bytes) + data_len + 4 adler32 bytes
   int num_blocks = (data_len + 65534) / 65535;
   if (num_blocks == 0) num_blocks = 1;
   int max_size = 2 + num_blocks * 5 + data_len + 4;
   unsigned char *out = (unsigned char *) malloc(max_size);
   if (!out) return NULL;

   int o = 0;
   out[o++] = 0x78; // 32K window, deflate
   out[o++] = 0x01; // check bits

   int rem = data_len;
   int src_pos = 0;
   while (rem > 0) {
      int block_len = rem > 65535 ? 65535 : rem;
      rem -= block_len;
      out[o++] = (unsigned char)(rem == 0 ? 1 : 0); // BFINAL
      out[o++] = (unsigned char)(block_len & 0xFF);
      out[o++] = (unsigned char)((block_len >> 8) & 0xFF);
      out[o++] = (unsigned char)(~block_len & 0xFF);
      out[o++] = (unsigned char)((~block_len >> 8) & 0xFF);
      memcpy(out + o, data + src_pos, block_len);
      o += block_len;
      src_pos += block_len;
   }

   // Adler-32
   unsigned int s1 = 1, s2 = 0;
   for (int i = 0; i < data_len; i++) {
      s1 = (s1 + data[i]) % 65521;
      s2 = (s2 + s1) % 65521;
   }
   unsigned int adler = (s2 << 16) | s1;
   out[o++] = (unsigned char)((adler >> 24) & 0xFF);
   out[o++] = (unsigned char)((adler >> 16) & 0xFF);
   out[o++] = (unsigned char)((adler >> 8) & 0xFF);
   out[o++] = (unsigned char)(adler & 0xFF);

   *out_len = o;
   return out;
}

STBIWDEF int stbi_write_png_to_func(stbi_write_func *s, void *context, int w, int h, int comp, const void *data, int stride_in_bytes) {
   int ctype[5] = { -1, 0, 4, 2, 6 };
   if (comp < 1 || comp > 4) return 0;
   int line_bytes = w * comp;
   if (stride_in_bytes == 0) stride_in_bytes = line_bytes;

   // PNG signature
   s(context, (void *) "\x89PNG\r\n\x1a\n", 8);

   // IHDR chunk
   unsigned char ihdr[17];
   memcpy(ihdr, "IHDR", 4);
   ihdr[4] = (unsigned char)((w >> 24) & 0xFF);
   ihdr[5] = (unsigned char)((w >> 16) & 0xFF);
   ihdr[6] = (unsigned char)((w >> 8) & 0xFF);
   ihdr[7] = (unsigned char)(w & 0xFF);
   ihdr[8] = (unsigned char)((h >> 24) & 0xFF);
   ihdr[9] = (unsigned char)((h >> 16) & 0xFF);
   ihdr[10] = (unsigned char)((h >> 8) & 0xFF);
   ihdr[11] = (unsigned char)(h & 0xFF);
   ihdr[12] = 8; // 8 bit depth
   ihdr[13] = (unsigned char) ctype[comp];
   ihdr[14] = 0; // compression
   ihdr[15] = 0; // filter
   ihdr[16] = 0; // interlace
   stbiw__writef(s, context, "4", 13);
   s(context, ihdr, 17);
   stbiw__wpcrc(s, context, ihdr, 17);

   // Prepare filtered raw image buffer (filter type 0 = none per scanline)
   int raw_size = h * (line_bytes + 1);
   unsigned char *raw = (unsigned char *) malloc(raw_size);
   if (!raw) return 0;

   const unsigned char *src = (const unsigned char *) data;
   unsigned char *dst = raw;
   for (int y = 0; y < h; y++) {
      *dst++ = 0; // filter none
      memcpy(dst, src + y * stride_in_bytes, line_bytes);
      dst += line_bytes;
   }

   int zlen = 0;
   unsigned char *zlib_data = stbi_zlib_compress(raw, raw_size, &zlen, 0);
   free(raw);

   if (!zlib_data) return 0;

   // IDAT chunk
   stbiw__writef(s, context, "4", zlen);
   s(context, (void *) "IDAT", 4);
   s(context, zlib_data, zlen);

   unsigned char *idat_crc_data = (unsigned char *) malloc(4 + zlen);
   if (idat_crc_data) {
      memcpy(idat_crc_data, "IDAT", 4);
      memcpy(idat_crc_data + 4, zlib_data, zlen);
      stbiw__wpcrc(s, context, idat_crc_data, 4 + zlen);
      free(idat_crc_data);
   }
   free(zlib_data);

   // IEND chunk
   stbiw__writef(s, context, "4", 0);
   s(context, (void *) "IEND", 4);
   unsigned char iend_crc[4] = { 'I', 'E', 'N', 'D' };
   stbiw__wpcrc(s, context, iend_crc, 4);

   return 1;
}

#endif // STB_IMAGE_WRITE_IMPLEMENTATION
