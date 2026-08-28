#include <iostream>

namespace api {
inline namespace v1 {
int version() {
    return 1;
}
}
}

class Label {
public:
    void show() & {
        std::cout << "persistent label\n";
    }

    void show() && {
        std::cout << "temporary label\n";
    }
};

int main() {
    Label label;
    label.show();
    Label().show();
    std::cout << "api=" << api::version() << '\n';
}
