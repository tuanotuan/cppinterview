// Real-World C++ Interviews Q068: What are modules and what advantages do they bring?
// Key: Modules provide named, separately compiled interfaces instead of repeatedly
// text-including headers. They can improve isolation and build scalability, but dependency
// scanning, binary module artifacts, macros, and toolchain interoperability require an explicit
// build design.
#include <iostream>

// A real module example needs a toolchain-specific multi-file build:
//   export module geometry;
//   export int area(int width, int height);
// This portable fallback keeps the lesson sample executable everywhere.
int area(int width, int height) {
    return width * height;
}

int main() {
    std::cout << area(6, 7) << '\n';
}
