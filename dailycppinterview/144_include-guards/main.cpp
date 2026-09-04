// Real-World C++ Interviews Q144: What are include guards?
// Key: Include guards wrap a header in a unique preprocessor macro so repeated inclusion in one
// translation unit does not repeat its declarations and definitions. `#pragma once` is widely
// supported but non-standard; macro guards remain the portable mechanism.
#include <iostream>

#ifndef DAILY_CPP_INTERVIEW_SAMPLE_GUARD
#define DAILY_CPP_INTERVIEW_SAMPLE_GUARD
inline int guarded_value() { return 42; }
#endif

int main() {
    std::cout << guarded_value() << '\n';
}
