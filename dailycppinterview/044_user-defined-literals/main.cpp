// Daily C++ Interview Q044: What are user-defined literals?
// Key: A user-defined literal maps a suffix such as `_km` to a literal operator that constructs
// a typed value at compile time or runtime. It can improve domain clarity, but suffixes
// beginning with an underscore are the safe namespace for user code.
#include <iostream>

struct Meter { long double value; };

constexpr Meter operator""_m(long double value) {
    return Meter{value};
}

int main() {
    constexpr auto distance = 2.5_m;
    std::cout << static_cast<double>(distance.value) << '\n';
}
