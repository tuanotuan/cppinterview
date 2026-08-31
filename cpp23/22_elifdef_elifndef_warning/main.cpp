#include <iostream>

#define FEATURE_DEMO

#if defined(UNKNOWN_FEATURE)
constexpr int selected = 0;
#elifdef FEATURE_DEMO
constexpr int selected = 23;
#elifndef OTHER_FEATURE
constexpr int selected = -1;
#endif

#if 0
#warning "This sample warning is intentionally disabled"
#endif

int main() {
    std::cout << "selected=" << selected << '\n';
}
