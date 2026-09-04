// Real-World C++ Interviews Q066: What is 3-way comparison?
// Key: The three-way operator `<=>` returns an ordering category such as strong, weak, or
// partial ordering. A defaulted comparison can synthesize lexicographic member comparison and
// supports rewritten relational operators, while `==` generation follows its own standard
// rules.
#include <compare>

struct Point {
    int x;
    int y;
    auto operator<=>(const Point&) const = default;
};

int main() {
    static_assert(Point{1, 2} < Point{2, 0});
}
