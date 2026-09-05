// Real-World C++ Interviews Q149: What is std in C++?
// Key: `std` is the namespace in which the C++ standard library declares most of its names,
// such as `std::string`, `std::vector`, and `std::sort`. Qualify names with `std::` or use
// narrow `using` declarations; a global `using namespace std;` risks collisions, and user code
// must not add declarations to `std` except for cases explicitly permitted by the standard.
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> values{3, 1, 2};
    std::sort(values.begin(), values.end());
    for (const int value : values) std::cout << value << ' ';
    std::cout << std::endl;
}
