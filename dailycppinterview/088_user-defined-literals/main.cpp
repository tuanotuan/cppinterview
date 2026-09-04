// Real-World C++ Interviews Q088: What are user-defined literals?
// Key: User-defined literals use a literal operator and a suffix such as `_ms` to construct a
// domain value directly from literal syntax. Keep conversion rules explicit and use
// reserved-safe suffix naming.
#include <iostream>

struct Meter { long double value; };

constexpr Meter operator""_m(long double value) {
    return Meter{value};
}

int main() {
    constexpr auto distance = 2.5_m;
    std::cout << static_cast<double>(distance.value) << '\n';
}
