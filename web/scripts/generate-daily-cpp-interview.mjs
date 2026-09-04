import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

const webRoot = process.cwd();
const repoRoot = path.resolve(webRoot, "..");
const sourceRoot = path.join(repoRoot, "dailycppinterview");
const catalogPath = path.join(webRoot, "content", "daily-cpp-interview-source.json");
const registryPath = path.join(webRoot, "content", "lesson-registry.yaml");
const questionPath = path.join(webRoot, "content", "questions", "daily-cpp-interview.yaml");
const englishCatalogPath = path.join(webRoot, "src", "content-translations", "en.json");

// This label shipped inside every v1 source file and therefore participates in
// the immutable lesson/question hashes. The UI maps it to the current display
// name; changing it here requires a new question version for all 146 entries.
const immutableSourceCollectionLabel = "Daily C++ Interview";

const difficultyLabel = {
  beginner: { vi: "Dễ", en: "Easy" },
  intermediate: { vi: "Trung bình", en: "Medium" },
  advanced: { vi: "Khó", en: "Hard" },
};

const syntaxByChapter = {
  "type-deduction": "auto value = expression; // inspect the exact deduced type",
  static: "static T value; // one storage duration or one class-wide member",
  polymorphism: "virtual void run(); // derived: void run() override;",
  lambdas: "auto result = [capture] { return expression; }();",
  const: "ReturnType operation() const;",
  "modern-practices": "Use the language construct that makes the contract compiler-checkable.",
  "smart-pointers": "auto owner = std::make_unique<T>();",
  references: "template<class T> void call(T&& value);",
  cpp20: "template<class T> concept Requirement = /* predicate */;",
  "special-members": "Type(const Type&) = default; Type(Type&&) noexcept = default;",
  "object-design": "Make ownership, invariants, and dispatch explicit in the interface.",
  behavior: "Check every language and library precondition before evaluating the expression.",
  stl: "std::algorithm(first, last, ...); // satisfy the documented range contract",
  "language-practice": "Prefer the form whose type, lifetime, and control flow are unambiguous.",
};

const codeContextByQuestion = {
  4: `auto myCollection = {1, 2, 3};`,
  113: `auto myCollection = {1, 2, 3};`,
  19: `#include <iostream>
#include <memory>

class Animal {
public:
    ~Animal() = default;

    virtual void eat(int quantity) {
        std::cout << "Animal eats " << quantity << '\\n';
    }

    void speak() {
        std::cout << "Animal speaks\\n";
    }
};

class Dog : public Animal {
public:
    void eat(unsigned int quantity) {
        std::cout << "Dog eats " << quantity << '\\n';
    }

    void speak() {
        std::cout << "Dog speaks\\n";
    }
};

int main() {
    Dog dog;
    dog.speak();
    dog.eat(42u);

    std::unique_ptr<Animal> animal = std::make_unique<Dog>();
    animal->speak();
    animal->eat(42u);
}`,
  28: `#include <iostream>

class A {
public:
    int value() { return 1; }
    int value() const { return 2; }
};

int main() {
    A a;
    const auto b = a.value();
    std::cout << b << '\\n';
}`,
  32: `#include <iostream>

class A {
public:
    int value() { return 1; }
    int value() const { return 2; }
};

int main() {
    A a;
    const auto b = a.value();
    std::cout << b << '\\n';
}`,
  115: `#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> numbers{1, 54, 7, 5335, 8};
    std::cout << std::binary_search(numbers.begin(), numbers.end(), 7) << '\\n';
}`,
  126: `unsigned int a1 = 42;
unsigned int a2{42};
unsigned int a3 = -42;
unsigned int a4{-42};`,
  127: `#include <iostream>

int main() {
    std::cout << 25u - 50 << '\\n';
}`,
  129: `int main() {
    int a, b, c;
    a = 9;
    c = a + 1 + 1 * 0;
    b = c++;
}`,
  130: `#include <string>

int main() {
    std::string(foo);
}`,
  133: `class MyObject {
public:
    void doSomething() {}
};

int main() {
    MyObject o();
    o.doSomething();
}`,
};

function normalizeSourceText(value) {
  return value.replace(/\r\n?/g, "\n").replace(/\n/g, "\r\n");
}

function sourceHash(markdown, code) {
  return createHash("sha256")
    .update(normalizeSourceText(markdown))
    .update(normalizeSourceText(code))
    .digest("hex");
}

function commentLines(label, value) {
  const words = `${label}${value}`.split(/\s+/u);
  const lines = [];
  let line = "// ";
  for (const word of words) {
    if ((line + word).length > 96) {
      lines.push(line.trimEnd());
      line = "// ";
    }
    line += `${word} `;
  }
  if (line.trim() !== "//") lines.push(line.trimEnd());
  return lines.join("\n");
}

function commonPreamble(item) {
  return [
    commentLines(`${immutableSourceCollectionLabel} Q${String(item.number).padStart(3, "0")}: `, item.prompt.en),
    commentLines("Key: ", item.answer.en),
    "",
  ].join("\n");
}

function codeFor(item) {
  const special = specialCode(item.number);
  if (special) return `${commonPreamble(item)}${special.trim()}\n`;

  const chapterSamples = {
    "type-deduction": `#include <type_traits>

int main() {
    const int source = ${item.number};
    auto value = source;
    const auto& view = source;
    static_assert(std::is_same_v<decltype(value), int>);
    static_assert(std::is_same_v<decltype(view), const int&>);
}`,
    static: `#include <iostream>

int next_id() {
    static int value = 0;
    return ++value;
}

int main() {
    std::cout << next_id() << ' ' << next_id() << '\\n';
}`,
    polymorphism: `#include <iostream>

struct Base {
    virtual ~Base() = default;
    virtual int value() const { return 1; }
};

struct Derived final : Base {
    int value() const override { return ${item.number}; }
};

int main() {
    Derived derived;
    const Base& base = derived;
    std::cout << base.value() << '\\n';
}`,
    lambdas: `#include <iostream>

int main() {
    const int seed = ${item.number};
    const auto result = [seed] { return seed + 1; }();
    std::cout << result << '\\n';
}`,
    const: `#include <iostream>

class Counter {
public:
    explicit Counter(int value) : value_(value) {}
    int value() const { return value_; }
    void increment() { ++value_; }

private:
    int value_;
};

int main() {
    const Counter counter{${item.number}};
    std::cout << counter.value() << '\\n';
}`,
    "modern-practices": `#include <iostream>
#include <type_traits>

enum class Result { success, failure };

int main() {
    constexpr Result result = Result::success;
    static_assert(std::is_enum_v<Result>);
    std::cout << (result == Result::success) << '\\n';
}`,
    "smart-pointers": `#include <iostream>
#include <memory>

struct Resource {
    explicit Resource(int value) : value(value) {}
    int value;
};

int main() {
    auto owner = std::make_unique<Resource>(${item.number});
    const Resource* observer = owner.get();
    std::cout << observer->value << '\\n';
}`,
    references: `#include <iostream>
#include <type_traits>
#include <utility>

template<class T>
decltype(auto) identity(T&& value) {
    return std::forward<T>(value);
}

int main() {
    int value = ${item.number};
    static_assert(std::is_lvalue_reference_v<decltype(identity(value))>);
    std::cout << identity(value) << '\\n';
}`,
    cpp20: `#include <concepts>
#include <iostream>

template<class T>
concept Number = std::integral<T> || std::floating_point<T>;

auto twice(Number auto value) {
    return value + value;
}

int main() {
    std::cout << twice(${item.number}) << '\\n';
}`,
    "special-members": `#include <iostream>
#include <string>

struct Value {
    std::string text;
};

int main() {
    Value first{std::to_string(${item.number})};
    Value second = first;
    std::cout << second.text << '\\n';
}`,
    "object-design": `#include <iostream>

class Score {
public:
    explicit Score(int value) : value_(value) {}
    int value() const { return value_; }

private:
    int value_;
};

int main() {
    const Score score{${item.number}};
    std::cout << score.value() << '\\n';
}`,
    behavior: `#include <iostream>
#include <optional>

std::optional<int> checked_divide(int numerator, int denominator) {
    if (denominator == 0) return std::nullopt;
    return numerator / denominator;
}

int main() {
    const auto result = checked_divide(${item.number}, 2);
    if (result) std::cout << *result << '\\n';
}`,
    stl: `#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> values{3, 1, 2};
    std::sort(values.begin(), values.end());
    std::cout << std::binary_search(values.begin(), values.end(), 2) << '\\n';
}`,
    "language-practice": `#include <iostream>

int classify(int value) {
    if (value < 0) return -1;
    if (value == 0) return 0;
    return 1;
}

int main() {
    std::cout << classify(${item.number}) << '\\n';
}`,
  };

  return `${commonPreamble(item)}${chapterSamples[item.chapter].trim()}\n`;
}

function specialCode(number) {
  const samples = {
    4: `#include <initializer_list>
#include <type_traits>

int main() {
    auto myCollection = {1, 2, 3};
    static_assert(std::is_same_v<decltype(myCollection), std::initializer_list<int>>);
}`,
    5: `#include <vector>

auto first(const std::vector<int>& values) -> int {
    return values.front();
}

int main() {
    return first({42}) == 42 ? 0 : 1;
}`,
    6: `#include <type_traits>
#include <utility>

int main() {
    int value = 0;
    static_assert(std::is_same_v<decltype(value), int>);
    static_assert(std::is_same_v<decltype((value)), int&>);
    static_assert(std::is_same_v<decltype(std::move(value)), int&&>);
}`,
    7: `#include <type_traits>

int value = 42;

decltype(auto) access() {
    return (value);
}

int main() {
    static_assert(std::is_same_v<decltype(access()), int&>);
}`,
    8: `#include <type_traits>

int main() {
    const auto sum = true + true;
    static_assert(std::is_same_v<decltype(sum), const int>);
    return sum == 2 ? 0 : 1;
}`,
    13: `#include <iostream>

void choose(int) { std::cout << "overload int\\n"; }
void choose(double) { std::cout << "overload double\\n"; }

struct Base {
    virtual ~Base() = default;
    virtual void run() const { std::cout << "base\\n"; }
};

struct Derived : Base {
    void run() const override { std::cout << "derived override\\n"; }
};

int main() {
    choose(1);
    Derived derived;
    static_cast<const Base&>(derived).run();
}`,
    15: `struct Base {
    virtual ~Base() = default;
    virtual int value() const { return 1; }
};

struct Derived : Base {
    int value() const override { return 2; }
};

int main() {
    Derived value;
    return value.value() == 2 ? 0 : 1;
}`,
    17: `#include <iostream>

struct Root { int value = 42; };
struct Left : virtual Root {};
struct Right : virtual Root {};
struct Leaf : Left, Right {};

int main() {
    Leaf leaf;
    leaf.Left::value = 7;
    std::cout << leaf.Right::value << '\\n';
}`,
    19: codeContextByQuestion[19],
    22: `#include <iostream>

struct Base {
    Base() { identify(); }
    virtual ~Base() { identify(); }
    virtual void identify() const { std::cout << "Base\\n"; }
};

struct Derived : Base {
    void identify() const override { std::cout << "Derived\\n"; }
};

int main() {
    Derived value;
    value.identify();
}`,
    23: `#include <memory>

struct Base {
    virtual ~Base() = default;
};

struct Derived : Base {
    ~Derived() override = default;
};

int main() {
    std::unique_ptr<Base> value = std::make_unique<Derived>();
}`,
    26: `#include <iostream>

bool checked() {
    std::cout << "right operand evaluated\\n";
    return true;
}

int main() {
    const bool first = false && checked();
    const bool second = true || checked();
    std::cout << first << ' ' << second << '\\n';
}`,
    27: `#include <iostream>

struct Resource {
    ~Resource() { std::cout << "released\\n"; }
};

int main() {
    Resource resource;
}`,
    28: codeContextByQuestion[28],
    29: `void seats(int) {}
void seats(double) = delete;

int main() {
    seats(5);
#if 0
    seats(5.5); // error: use of deleted function
#endif
}`,
    30: `#include <iostream>

int main() {
    const auto value = [] {
        const int base = 40;
        return base + 2;
    }();
    std::cout << value << '\\n';
}`,
    31: `#include <iostream>
#include <memory>

int main() {
    int by_reference = 1;
    auto owned = std::make_unique<int>(2);
    auto call = [copy = 3, &by_reference, value = std::move(owned)] {
        ++by_reference;
        return copy + *value;
    };
    std::cout << call() << ' ' << by_reference << '\\n';
}`,
    32: codeContextByQuestion[32],
    41: `#include <iostream>

consteval int square(int value) {
    return value * value;
}

constinit int runtime_mutable = square(3);

int main() {
    ++runtime_mutable;
    std::cout << runtime_mutable << '\\n';
}`,
    43: `struct Meter {
    explicit Meter(double value) : value(value) {}
    double value;
};

void use(Meter) {}

int main() {
    use(Meter{2.0});
#if 0
    use(2.0); // blocked by explicit
#endif
}`,
    44: `#include <iostream>

struct Meter { long double value; };

constexpr Meter operator""_m(long double value) {
    return Meter{value};
}

int main() {
    constexpr auto distance = 2.5_m;
    std::cout << static_cast<double>(distance.value) << '\\n';
}`,
    45: `#include <cstddef>
#include <iostream>

void choose(int) { std::cout << "integer\\n"; }
void choose(const int*) { std::cout << "pointer\\n"; }

int main() {
    choose(nullptr);
}`,
    47: `#include <type_traits>

enum class Color : unsigned char { red, green, blue };

int main() {
    static_assert(std::is_same_v<std::underlying_type_t<Color>, unsigned char>);
    constexpr auto color = Color::green;
    return color == Color::green ? 0 : 1;
}`,
    48: `#include <type_traits>

struct NonCopyable {
    NonCopyable() = default;
    NonCopyable(const NonCopyable&) = delete;
    NonCopyable& operator=(const NonCopyable&) = delete;
};

int main() {
    static_assert(!std::is_copy_constructible_v<NonCopyable>);
}`,
    50: `#include <type_traits>

struct Record {
    int id;
    double value;
};

int main() {
    static_assert(std::is_trivially_copyable_v<Record>);
}`,
    51: `#include <iostream>

struct Resource {
    Resource() { std::cout << "acquire\\n"; }
    ~Resource() { std::cout << "release\\n"; }
};

int main() {
    Resource resource;
}`,
    52: `#include <iostream>
#include <memory>

int main() {
    auto owner = std::make_unique<int>(42);
    auto next_owner = std::move(owner);
    std::cout << *next_owner << ' ' << std::boolalpha << (owner == nullptr) << '\\n';
}`,
    53: `#include <iostream>
#include <memory>

int main() {
    auto first = std::make_shared<int>(42);
    auto second = first;
    std::cout << *second << ' ' << first.use_count() << '\\n';
}`,
    54: `#include <iostream>
#include <memory>

int main() {
    auto owner = std::make_shared<int>(42);
    std::weak_ptr<int> observer = owner;
    if (auto locked = observer.lock()) std::cout << *locked << '\\n';
}`,
    58: `#include <iostream>
#include <string>
#include <utility>

int main() {
    std::string source = "resource";
    std::string destination = std::move(source);
    std::cout << destination << '\\n';
}`,
    59: `#include <iostream>
#include <utility>

void consume(int&) { std::cout << "lvalue\\n"; }
void consume(int&&) { std::cout << "rvalue\\n"; }

template<class T>
void relay(T&& value) {
    consume(std::forward<T>(value));
}

int main() {
    int value = 0;
    relay(value);
    relay(1);
}`,
    61: `#include <type_traits>

template<class T>
using Lvalue = T&;

int main() {
    static_assert(std::is_same_v<Lvalue<int&>, int&>);
    static_assert(std::is_same_v<int&&, int&&>);
}`,
    62: `#include <iostream>

constexpr int square(int value) {
    return value * value;
}

int main(int argc, char**) {
    constexpr int compile_time = square(4);
    const int runtime = square(argc);
    std::cout << compile_time << ' ' << runtime << '\\n';
}`,
    64: `#include <concepts>
#include <iostream>

auto add(std::integral auto left, std::integral auto right) {
    return left + right;
}

int main() {
    std::cout << add(20, 22) << '\\n';
}`,
    66: `#include <compare>

struct Point {
    int x;
    int y;
    auto operator<=>(const Point&) const = default;
};

int main() {
    static_assert(Point{1, 2} < Point{2, 0});
}`,
    68: `#include <iostream>

// A real module example needs a toolchain-specific multi-file build:
//   export module geometry;
//   export int area(int width, int height);
// This portable fallback keeps the lesson sample executable everywhere.
int area(int width, int height) {
    return width * height;
}

int main() {
    std::cout << area(6, 7) << '\\n';
}`,
    69: `#include <algorithm>
#include <cstddef>

class Buffer {
public:
    explicit Buffer(std::size_t size) : size_(size), data_(new int[size]{}) {}
    ~Buffer() { delete[] data_; }
    Buffer(const Buffer& other) : Buffer(other.size_) {
        std::copy(other.data_, other.data_ + size_, data_);
    }
    Buffer& operator=(const Buffer& other) {
        if (this == &other) return *this;
        Buffer copy(other);
        std::swap(size_, copy.size_);
        std::swap(data_, copy.data_);
        return *this;
    }

private:
    std::size_t size_;
    int* data_;
};

int main() {
    Buffer first(3);
    Buffer second = first;
}`,
    70: `#include <memory>
#include <utility>

class Owner {
public:
    Owner() : value_(std::make_unique<int>(42)) {}
    ~Owner() = default;
    Owner(const Owner& other) : value_(std::make_unique<int>(*other.value_)) {}
    Owner& operator=(const Owner& other) {
        if (this != &other) value_ = std::make_unique<int>(*other.value_);
        return *this;
    }
    Owner(Owner&&) noexcept = default;
    Owner& operator=(Owner&&) noexcept = default;

private:
    std::unique_ptr<int> value_;
};

int main() {
    Owner first;
    Owner second = std::move(first);
}`,
    71: `#include <string>
#include <vector>

struct Report {
    std::string title;
    std::vector<int> values;
};

int main() {
    Report first{"daily", {1, 2, 3}};
    Report second = first;
    Report third = std::move(second);
}`,
    76: `#include <type_traits>
#include <vector>

struct Value {
    int number = 0;
};

int main() {
    static_assert(std::is_default_constructible_v<Value>);
    std::vector<Value> values(3);
}`,
    77: `struct PublicData {
    int value;
};

class ProtectedInvariant {
public:
    explicit ProtectedInvariant(int value) : value_(value) {}
    int value() const { return value_; }

private:
    int value_;
};

int main() {
    PublicData data{1};
    ProtectedInvariant object{2};
    return data.value + object.value() == 3 ? 0 : 1;
}`,
    78: `struct Value {
    Value() : Value(42) {}
    explicit Value(int value) : value(value) {}
    int value;
};

int main() {
    Value value;
    return value.value == 42 ? 0 : 1;
}`,
    82: `class Vault {
    friend int inspect(const Vault& value);

public:
    explicit Vault(int code) : code_(code) {}

private:
    int code_;
};

int inspect(const Vault& value) {
    return value.code_;
}

int main() {
    return inspect(Vault{42}) == 42 ? 0 : 1;
}`,
    83: `#include <iostream>

int next() {
    static int value = 0;
    return ++value;
}

void show(int value = next()) {
    std::cout << value << '\\n';
}

int main() {
    show();
    show();
}`,
    84: `#include <iostream>

struct Value {
    int number;
    void show() const {
        std::cout << this->number << '\\n';
    }
};

int main() {
    Value value{42};
    value.show();
}`,
    89: `#include <iostream>

enum class WriteMode { append, truncate };

void write(WriteMode mode) {
    std::cout << (mode == WriteMode::append ? "append" : "truncate") << '\\n';
}

int main() {
    write(WriteMode::append);
}`,
    90: `#include <iostream>
#include <memory>
#include <vector>

int main() {
    auto shared = std::make_shared<int>(1);
    auto shallow = shared;
    std::vector<int> deep_source{1};
    auto deep = deep_source;
    *shallow = 2;
    deep[0] = 3;
    std::cout << *shared << ' ' << deep_source[0] << '\\n';
}`,
    91: `#include <iostream>

struct Plain {
    int value;
    void operation() {}
};

struct Polymorphic {
    virtual ~Polymorphic() = default;
    int value;
};

int main() {
    std::cout << sizeof(Plain) << ' ' << sizeof(Polymorphic) << '\\n';
}`,
    92: `#include <iostream>

struct Base {
    virtual ~Base() = default;
    virtual const char* name() const { return "Base"; }
};

struct Derived : Base {
    const char* name() const override { return "Derived"; }
};

int main() {
    Derived object;
    const Base& view = object;
    std::cout << view.name() << '\\n';
}`,
    95: `#include <memory>

struct Shape {
    virtual ~Shape() = default;
    virtual double area() const = 0;
};

struct Square : Shape {
    explicit Square(double side) : side(side) {}
    double area() const override { return side * side; }
    double side;
};

int main() {
    std::unique_ptr<Shape> shape = std::make_unique<Square>(2.0);
    return shape->area() == 4.0 ? 0 : 1;
}`,
    96: `#include <iostream>
#include <variant>

struct Circle { double radius; };
struct Square { double side; };

int main() {
    std::variant<Circle, Square> shape = Square{2.0};
    const auto area = std::visit([](const auto& value) {
        if constexpr (requires { value.radius; }) return 3.14 * value.radius * value.radius;
        else return value.side * value.side;
    }, shape);
    std::cout << area << '\\n';
}`,
    97: `#include <iostream>

template<class Derived>
struct Printable {
    void print() const {
        static_cast<const Derived&>(*this).print_impl();
    }
};

struct Answer : Printable<Answer> {
    void print_impl() const { std::cout << 42 << '\\n'; }
};

int main() {
    Answer{}.print();
}`,
    98: `#include <optional>

class Connection {
public:
    static std::optional<Connection> create(bool available) {
        if (!available) return std::nullopt;
        return Connection{};
    }

private:
    Connection() = default;
};

int main() {
    return Connection::create(true).has_value() ? 0 : 1;
}`,
    106: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> values{1, 2, 3};
    const auto old_data = values.data();
    values.reserve(100);
    const bool reallocated = old_data != values.data();
    std::cout << std::boolalpha << reallocated << '\\n';
}`,
    110: `#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    const std::vector<int> left{1, 2, 3};
    const std::vector<int> right{10, 20};
    std::vector<int> sums;
    const auto count = std::min(left.size(), right.size());
    for (std::size_t index = 0; index < count; ++index) {
        sums.push_back(left[index] + right[index]);
    }
    std::cout << sums.size() << '\\n';
}`,
    111: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> values;
    values.reserve(4);
    values.push_back(1);
    values.push_back(2);
    std::cout << values.size() << ' ' << values.capacity() << ' '
              << static_cast<const void*>(values.data()) << '\\n';
}`,
    114: `#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    const std::vector<int> values{1, 2, 3};
    const auto found = std::find(values.cbegin(), values.cend(), 2);
    if (found != values.cend()) std::cout << *found << '\\n';
}`,
    115: `#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> numbers{1, 54, 7, 5335, 8};
    std::sort(numbers.begin(), numbers.end());
    std::cout << std::boolalpha
              << std::binary_search(numbers.begin(), numbers.end(), 7) << '\\n';
}`,
    119: `#include <iostream>

struct Base {
    virtual ~Base() = default;
    virtual void show(int value = 1) const { std::cout << "Base " << value << '\\n'; }
};

struct Derived : Base {
    void show(int value = 2) const override { std::cout << "Derived " << value << '\\n'; }
};

int main() {
    Derived object;
    const Base& base = object;
    base.show();
}`,
    121: `#include <iostream>
#include <optional>

class Value {
public:
    explicit Value(int input) : input_(input) {}
    int doubled() const {
        if (!cache_) cache_ = input_ * 2;
        return *cache_;
    }

private:
    int input_;
    mutable std::optional<int> cache_;
};

int main() {
    const Value value{21};
    std::cout << value.doubled() << '\\n';
}`,
    123: `#include <iostream>

inline int square(int value) {
    return value * value;
}

int main() {
    std::cout << square(6) << '\\n';
}`,
    124: `#include <iostream>
#include <stdexcept>

int main() {
    try {
        throw std::runtime_error("failure");
    } catch (const std::exception& error) {
        std::cout << error.what() << '\\n';
    }
}`,
    125: `#include <iostream>

void increment(int& value) { ++value; }
void reset(int* value) { if (value) *value = 0; }

int main() {
    int value = 1;
    increment(value);
    reset(&value);
    std::cout << value << '\\n';
}`,
    126: `#include <limits>

int main() {
    unsigned int first = 42;
    unsigned int second{42};
    unsigned int third = -42;
#if 0
    unsigned int fourth{-42}; // narrowing: ill-formed
#endif
    return first == second && third == std::numeric_limits<unsigned int>::max() - 41 ? 0 : 1;
}`,
    127: `#include <iostream>
#include <limits>

int main() {
    const auto result = 25u - 50;
    std::cout << result << '\\n';
    return result == std::numeric_limits<unsigned int>::max() - 24 ? 0 : 1;
}`,
    128: `#include <iostream>

int main() {
    int prefix = 1;
    int postfix = 1;
    const int new_value = ++prefix;
    const int old_value = postfix++;
    std::cout << new_value << ' ' << old_value << ' ' << postfix << '\\n';
}`,
    129: `#include <iostream>

int main() {
    int a, b, c;
    a = 9;
    c = a + 1 + 1 * 0;
    b = c++;
    std::cout << a << ' ' << b << ' ' << c << '\\n';
}`,
    130: `#include <iostream>
#include <string>

int main() {
    std::string(foo);
    std::cout << std::boolalpha << foo.empty() << '\\n';
}`,
    131: `#include <iostream>

struct Value {
    int number = 42;
    Value() = default;
    explicit Value(int input) : number(input) {}
};

int main() {
    std::cout << Value{}.number << ' ' << Value{7}.number << '\\n';
}`,
    132: `struct Value {};

Value make_value() {
    Value value{};
    return value;
}

int main() {
    Value object{};
    (void)object;
}`,
    133: `class MyObject {
public:
    void doSomething() {}
};

int main() {
#if 0
    MyObject o(); // declares a function
    o.doSomething();
#endif
    MyObject object{};
    object.doSomething();
}`,
    134: `#include <iostream>
#include <string>
#include <string_view>

void show(std::string_view value) {
    std::cout << value.substr(0, 5) << '\\n';
}

int main() {
    const std::string owner = "hello view";
    show(owner);
}`,
    135: `#include <iostream>
#include <string_view>

int main() {
    constexpr std::string_view value = "daily interview";
    std::cout << std::boolalpha << value.starts_with("daily") << ' '
              << value.ends_with("view") << '\\n';
}`,
    136: `#include <iostream>

struct Value {
    Value() = default;
    Value(const Value&) { std::cout << "copy\\n"; }
};

Value create() {
    return Value{};
}

int main() {
    [[maybe_unused]] Value value = create();
}`,
    137: `#include <string>

struct Report {
    std::string text;
};

Report create(bool detailed) {
    if (detailed) return Report{"detailed"};
    return Report{"brief"};
}

int main() {
    const auto report = create(true);
    return report.text == "detailed" ? 0 : 1;
}`,
    138: `#include <type_traits>
#include <utility>

int main() {
    int value = 0;
    static_assert(std::is_lvalue_reference_v<decltype((value))>);
    static_assert(std::is_rvalue_reference_v<decltype(std::move(value))>);
    static_assert(!std::is_reference_v<decltype(42)>);
}`,
    139: `#include <utility>

int main() {
    const int signed_value = -3;
    const unsigned unsigned_value = 7;
    return std::cmp_less(signed_value, unsigned_value) ? 0 : 1;
}`,
    141: `#include <iostream>

void render(int width, int height = 10) {
    std::cout << width << 'x' << height << '\\n';
}

void render(const char* preset) {
    std::cout << preset << '\\n';
}

int main() {
    render(20);
    render("compact");
}`,
    143: `#include <iostream>

enum class State { idle, running, stopped };

const char* name(State state) {
    switch (state) {
        case State::idle: return "idle";
        case State::running: return "running";
        case State::stopped: return "stopped";
    }
    return "invalid";
}

int main() {
    std::cout << name(State::running) << '\\n';
}`,
    144: `#include <iostream>

#ifndef DAILY_CPP_INTERVIEW_SAMPLE_GUARD
#define DAILY_CPP_INTERVIEW_SAMPLE_GUARD
inline int guarded_value() { return 42; }
#endif

int main() {
    std::cout << guarded_value() << '\\n';
}`,
    146: `#include <iostream>

int classify(int value) {
    if (value < 0) return -1;
    if (value == 0) return 0;
    return 1;
}

int main() {
    std::cout << classify(-1) << ' ' << classify(0) << ' ' << classify(1) << '\\n';
}`,
  };

  const duplicate = {
    49: 29, 67: 41, 72: 58, 73: 27, 74: 48, 75: 50, 79: 16,
    80: 13, 81: 15, 85: 17, 86: 18, 87: 25, 88: 44, 112: 24,
    113: 4, 117: 22, 118: 83, 120: 94,
  };

  if (samples[number]) return samples[number];
  if (duplicate[number]) return samples[duplicate[number]] ?? null;
  return null;
}

function markdownPrompt(prompt) {
  return prompt.replaceAll("<filename>", "\\<filename\\>");
}

function lessonMarkdown(item, locale, code) {
  const isVi = locale === "vi";
  const prompt = markdownPrompt(item.prompt[locale]);
  const answer = item.answer[locale];
  const title = isVi
    ? `Câu ${String(item.number).padStart(3, "0")}: ${prompt}`
    : `Question ${String(item.number).padStart(3, "0")}: ${prompt}`;
  const chapter = catalog.chapters.find((entry) => entry.id === item.chapter);
  const difficulty = difficultyLabel[item.difficulty][locale];
  const syntax = syntaxByChapter[item.chapter];
  const codeLines = code.split("\n");
  while (codeLines[0]?.startsWith("//")) codeLines.shift();
  while (codeLines[0]?.trim() === "") codeLines.shift();
  const codePreview = codeLines
    .slice(0, 12)
    .join("\n")
    .trim();

  if (isVi) {
    return `# ${title}

## 1. Vấn đề nó giải quyết

Đây là một chủ đề phỏng vấn C++ độc lập trong bộ ${immutableSourceCollectionLabel}. Mục tiêu là trả lời đúng trọng tâm, nêu quy tắc chi phối và phân biệt hành vi do chuẩn quy định với chi tiết riêng của compiler.

## 2. Kiến thức cần có

- Cú pháp C++ cơ bản và cách đọc kiểu của biểu thức.
- Khái niệm lifetime, ownership, overload resolution hoặc library contract khi chúng liên quan.
- Khả năng lần theo một ví dụ nhỏ trước khi kết luận.

## 3. Ý tưởng cốt lõi

${answer}

Một câu trả lời phỏng vấn tốt nên nói kết luận trước, sau đó giải thích điều kiện áp dụng và chốt lại hệ quả thực tế.

## 4. Cú pháp tối thiểu

~~~cpp
${syntax}
~~~

Cú pháp chỉ là điểm bắt đầu; cần kiểm tra kiểu, value category, lifetime và precondition thay vì suy luận từ tên gọi.

## 5. Cách nó hoạt động

1. Xác định entity hoặc biểu thức mà câu hỏi đang nói tới.
2. Áp dụng quy tắc C++ phù hợp trước khi dự đoán output hay hiệu năng.
3. Nêu rõ trường hợp ngoại lệ, hành vi phụ thuộc implementation hoặc undefined behavior nếu có.
4. Kiểm chứng bằng một chương trình tối thiểu và warning nghiêm ngặt.

## 6. Lỗi thường gặp

- Trả lời theo một lần chạy duy nhất rồi xem đó là quy tắc của chuẩn.
- Nhầm ownership với quyền truy cập hoặc nhầm compile-time selection với runtime dispatch.
- Bỏ qua precondition, lifetime hay conversion ẩn.
- Khẳng định tuyệt đối trong khi đáp án phụ thuộc context.

## 7. Khi nào nên dùng

Dùng kiến thức này khi review API, đọc code, giải thích diagnostic hoặc thiết kế abstraction có liên quan đến ${chapter.vi}. Trong code production, hãy ưu tiên dạng làm contract hiện rõ và được compiler kiểm tra.

## 8. Ví dụ đơn giản

File <code>main.cpp</code> đi kèm là ví dụ nhỏ, tự chứa và biên dịch bằng C++20:

~~~cpp
${codePreview}
~~~

Chạy với warning nghiêm ngặt để đối chiếu kết luận thay vì ghi nhớ output máy móc.

## 9. Điều cần nhớ

- ${answer}
- Độ khó ước tính: **${difficulty}**.
- Câu hỏi giữ nguyên một mục nguồn; không có biến thể Dễ/Trung bình/Khó được tự sinh.
- Nội dung giải thích và code mẫu được biên soạn lại độc lập từ chủ đề phỏng vấn.

## 10. Câu hỏi tự kiểm tra

1. ${difficulty} — ${prompt}
`;
  }

  return `# ${title}

## 1. Problem It Solves

This is one self-contained C++ interview topic from the ${immutableSourceCollectionLabel} collection. The goal is to give the conclusion, name the governing rule, and separate standard behavior from compiler-specific details.

## 2. Prerequisites

- Basic C++ syntax and expression-type reasoning.
- Lifetime, ownership, overload resolution, or library contracts when relevant.
- The ability to trace a minimal example before drawing a conclusion.

## 3. Core Idea

${answer}

A strong interview answer leads with the conclusion, states the conditions under which it holds, and closes with the practical consequence.

## 4. Minimal Syntax

~~~cpp
${syntax}
~~~

Syntax is only the starting point. Check types, value categories, lifetimes, and preconditions rather than inferring behavior from a name.

## 5. How It Works

1. Identify the entity or expression named by the question.
2. Apply the relevant C++ rule before predicting output or performance.
3. Call out exceptions, implementation dependence, or undefined behavior where applicable.
4. Verify the reasoning with a minimal program and strict warnings.

## 6. Common Mistakes

- Treating one observed run as the language rule.
- Confusing ownership with access, or compile-time selection with runtime dispatch.
- Ignoring a precondition, lifetime, or implicit conversion.
- Giving an absolute answer when the result depends on context.

## 7. When to Use It

Use this knowledge while reviewing APIs, reading code, explaining diagnostics, or designing abstractions related to ${chapter.en}. In production, prefer forms that make the contract visible and compiler-checkable.

## 8. Simple Example

The companion <code>main.cpp</code> is a small, self-contained C++20 example:

~~~cpp
${codePreview}
~~~

Run it with strict warnings to verify the reasoning instead of memorizing output.

## 9. Key Takeaways

- ${answer}
- Estimated difficulty: **${difficulty}**.
- This lesson keeps exactly one source question; no Easy/Medium/Hard variants are generated.
- The explanation and sample code are independently authored around the interview topic.

## 10. Self-Check Question

1. ${difficulty} — ${prompt}
`;
}

function questionRecord(item, hash, version) {
  const code = codeContextByQuestion[item.number];
  const type = code ? "code_reasoning" : item.difficulty === "advanced" ? "pitfall" : "recall";
  return {
    id: `dailycpp-q${String(item.number).padStart(3, "0")}-001`,
    lessonId: `dailycpp-q${String(item.number).padStart(3, "0")}`,
    type,
    responseMode: "text",
    difficulty: item.difficulty,
    interviewCategory: "language_knowledge",
    interviewFormat: "concept_explanation",
    estimatedMinutes: item.difficulty === "beginner" ? 2 : item.difficulty === "intermediate" ? 4 : 6,
    prompt: item.prompt.vi,
    ...(code ? { code } : {}),
    hint: "Nêu kết luận trước, sau đó chỉ ra quy tắc C++ và điều kiện khiến kết luận đó đúng.",
    answer: {
      short: item.answer.vi,
      detailed: `${item.answer.vi}\n\nHãy liên hệ trực tiếp kết luận với kiểu, lifetime, ownership, overload resolution hoặc library contract xuất hiện trong câu hỏi. Nếu kết quả phụ thuộc implementation hoặc vi phạm precondition, cần nói rõ thay vì chỉ đoán output.`,
    },
    rubric: {
      required: [
        "Trả lời trực tiếp đúng câu hỏi nguồn.",
        "Nêu đúng quy tắc C++ và điều kiện áp dụng.",
        "Không suy diễn từ một compiler hoặc một lần chạy duy nhất.",
      ],
      bonus: [
        "Nêu được hệ quả về thiết kế API, lifetime, ownership, portability hoặc hiệu năng.",
      ],
      misconceptions: [
        "Chỉ nhắc lại thuật ngữ mà không giải thích cơ chế hoặc điều kiện.",
      ],
    },
    sources: [
      { sectionId: "y-tuong-cot-loi" },
      { sectionId: "cach-no-hoat-dong" },
      { sectionId: "cau-hoi-tu-kiem-tra" },
    ],
    sourceHash: hash,
    status: "draft",
    version,
  };
}

function englishQuestionTranslation(item, hash, version) {
  return {
    questionId: `dailycpp-q${String(item.number).padStart(3, "0")}-001`,
    questionVersion: version,
    sourceHash: hash,
    status: "draft",
    prompt: item.prompt.en,
    hint: "Lead with the conclusion, then identify the C++ rule and the conditions that make it true.",
    answer: {
      short: item.answer.en,
      detailed: `${item.answer.en}\n\nConnect the conclusion directly to the type, lifetime, ownership, overload-resolution rule, or library contract present in the question. State implementation dependence or a violated precondition explicitly instead of merely guessing output.`,
    },
    rubric: {
      required: [
        "Directly answers the single source question.",
        "States the governing C++ rule and its conditions.",
        "Does not generalize from one compiler or one observed run.",
      ],
      bonus: [
        "Explains an API, lifetime, ownership, portability, or performance consequence.",
      ],
      misconceptions: [
        "Repeats a term without explaining its mechanism or conditions.",
      ],
    },
  };
}

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
if (catalog.questions.length !== 146) {
  throw new Error(`Expected 146 source questions, found ${catalog.questions.length}`);
}
if (!Number.isInteger(catalog.collection.defaultQuestionVersion) ||
    catalog.collection.defaultQuestionVersion < 1) {
  throw new Error("defaultQuestionVersion must be a positive integer");
}
for (const [index, item] of catalog.questions.entries()) {
  if (item.number !== index + 1) {
    throw new Error(`Question order breaks at index ${index}`);
  }
}

const normalizedPromptGroups = new Map();
for (const item of catalog.questions) {
  const key = item.prompt.en.trim().toLowerCase();
  normalizedPromptGroups.set(key, [...(normalizedPromptGroups.get(key) ?? []), item.number]);
}
const duplicateGroups = [...normalizedPromptGroups.values()].filter((numbers) => numbers.length > 1);
if (normalizedPromptGroups.size !== 127 || duplicateGroups.length !== 19) {
  throw new Error("Source duplicate contract changed; expected 127 unique prompts and 19 duplicate pairs");
}
for (const item of catalog.questions.filter((question) => question.repeatOf)) {
  const original = catalog.questions.find(
    (question) => question.sourceId === item.repeatOf,
  );
  if (!original || original.prompt.en !== item.prompt.en) {
    throw new Error(`Question ${item.number} has an invalid repeatOf source`);
  }
  if (original.difficulty !== item.difficulty) {
    throw new Error(`Question ${item.number} must retain its repeated prompt's difficulty`);
  }
}

const existingQuestionDocument = parseYaml(await readFile(questionPath, "utf8"));
const existingQuestions = new Map(
  existingQuestionDocument.questions.map((question) => [question.id, question]),
);
const generated = catalog.questions.map((item) => {
  const code = codeFor(item);
  const viMarkdown = lessonMarkdown(item, "vi", code);
  const enMarkdown = lessonMarkdown(item, "en", code);
  const hash = sourceHash(viMarkdown, code);
  const version = item.questionVersion ??
    catalog.collection.defaultQuestionVersion;
  if (!Number.isInteger(version) || version < 1) {
    throw new Error(`Question ${item.number} has an invalid questionVersion`);
  }
  const question = questionRecord(item, hash, version);
  const existing = existingQuestions.get(question.id);
  if (existing && existing.sourceHash !== hash && version <= existing.version) {
    throw new Error(
      `Question ${question.id} content changed at v${version}; ` +
      "increment questionVersion before regenerating immutable content",
    );
  }
  return {
    item,
    sourcePath: path.posix.join("dailycppinterview", item.directory),
    directory: path.join(sourceRoot, item.directory),
    code,
    viMarkdown,
    enMarkdown,
    hash,
    version,
    question,
  };
});

// Validate every immutable revision before touching generated files. A stale
// version must not leave a partially regenerated source tree behind.
await mkdir(sourceRoot, { recursive: true });
for (const entry of generated) {
  await mkdir(entry.directory, { recursive: true });
  await Promise.all([
    writeFile(path.join(entry.directory, "vi.md"), entry.viMarkdown, "utf8"),
    writeFile(path.join(entry.directory, "en.md"), entry.enMarkdown, "utf8"),
    writeFile(path.join(entry.directory, "main.cpp"), entry.code, "utf8"),
  ]);
}

const registry = parseYaml(await readFile(registryPath, "utf8"));
registry.lessons = registry.lessons.filter((lesson) => lesson.track !== "dailycpp");
registry.lessons.push(...generated.map(({ item, sourcePath }, index) => ({
  id: `dailycpp-q${String(item.number).padStart(3, "0")}`,
  sourcePath,
  language: "cpp",
  track: "dailycpp",
  order: item.number,
  tags: ["daily-cpp-interview", item.chapter],
  prerequisites: index === 0
    ? []
    : [`dailycpp-q${String(item.number - 1).padStart(3, "0")}`],
})));
await writeFile(registryPath, stringifyYaml(registry, { lineWidth: 100 }), "utf8");

const questions = generated.map(({ question }) => question);
await writeFile(
  questionPath,
  stringifyYaml({ schemaVersion: 1, questions }, { lineWidth: 100 }),
  "utf8",
);

const englishCatalog = JSON.parse(await readFile(englishCatalogPath, "utf8"));
englishCatalog.questions = englishCatalog.questions
  .filter((question) => !question.questionId.startsWith("dailycpp-q"))
  .concat(generated.map(({ item, hash, version }) => {
    return englishQuestionTranslation(item, hash, version);
  }));
await writeFile(englishCatalogPath, `${JSON.stringify(englishCatalog, null, 2)}\n`, "utf8");

console.log(
  `Generated ${generated.length} Real-World C++ Interviews lessons, ${questions.length} questions, and ${generated.length} English question translations.`,
);
